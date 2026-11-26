// Edge Function: create-public-appointment
//
// Única vía autorizada para que un paciente (sin cuenta, sin login) cree una
// cita real. Corre en el servidor porque:
//   - patients/appointments no tienen policy de INSERT para `anon` (FASE 9,
//     a propósito: un paciente anónimo no debe poder escribir directo ahí).
//   - crear el paciente por DNI y crear la cita deben pasar siempre por la
//     misma validación server-side, nunca por lo que el cliente decida enviar.
//
// La seguridad real contra choques de horario NO vive aquí: vive en las
// restricciones de exclusión `appointments_no_overlap` (misma profesional) y
// `appointments_no_patient_overlap` (mismo paciente). Esta función solo
// intenta el INSERT y traduce el error de la restricción a un mensaje
// entendible, así que es segura aunque dos personas reserven a la vez.
//
// La validación y los cálculos viven en booking.ts (probados con Vitest).
//
// Tras crear la cita se envía el código al correo del paciente. El correo
// nunca rompe la reserva: si falla, la respuesta lleva emailSent: false.
import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2';
import { sendEmail } from '../_shared/email.ts';
import { bookingEmail } from '../_shared/emailTemplates.ts';
import {
  addMinutes,
  bookingMatchesPatient,
  bookingRecipient,
  isStaffRole,
  limaToday,
  otherBranchSameDayError,
  missingPatientFields,
  overlapErrorMessage,
  serviceOfferError,
  validateBookingPayload,
  type CreateAppointmentPayload,
} from './booking.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SLOT_TAKEN = 'Ese horario ya no está disponible. Elige otro.';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// "Nueva cita" del panel llama con la sesión del personal; el paciente, sin
// sesión (con la clave publishable, que no es un JWT). Solo un token válido de
// una cuenta interna activa cuenta como personal: no se puede falsificar.
async function callerIsStaff(req: Request, client: SupabaseClient): Promise<boolean> {
  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  if (!token.startsWith('ey')) {
    return false;
  }
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) {
    return false;
  }
  const { data: profile } = await client.from('profiles').select('role, active').eq('id', data.user.id).maybeSingle();
  return Boolean(profile?.active) && isStaffRole(profile?.role);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Método no permitido.' }, 405);
  }

  let payload: CreateAppointmentPayload;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: 'Cuerpo de la solicitud inválido.' }, 400);
  }

  const validation = validateBookingPayload(payload ?? {}, limaToday());
  if (!validation.ok) {
    return jsonResponse({ error: validation.error }, 400);
  }
  const booking = validation.value;

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SB_SECRET_KEY');

  if (!serviceRoleKey) {
    return jsonResponse({ error: 'La función no está configurada correctamente (falta SB_SECRET_KEY).' }, 500);
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  // Las lecturas son independientes: van en paralelo para que la reserva se
  // confirme en menos de 3 s. Sede y profesional solo dan nombres al correo.
  const [serviceResult, offerResult, slotsResult, patientResult, branchResult, professionalResult] = await Promise.all([
    adminClient
      .from('services')
      .select('name, duration_minutes')
      .eq('id', booking.serviceId)
      .eq('active', true)
      .maybeSingle(),
    // El servicio es de la sede elegida, es reservable y esa profesional lo
    // atiende (un POST directo no se salta la oferta de la sede).
    adminClient.rpc('is_bookable_service', {
      p_branch_id: booking.branchId,
      p_service_id: booking.serviceId,
      p_professional_id: booking.professionalId,
    }),
    // get_available_slots ya comprueba que la profesional esté activa,
    // atienda en esa sede y ofrezca ese servicio.
    adminClient.rpc('get_available_slots', {
      p_professional_id: booking.professionalId,
      p_branch_id: booking.branchId,
      p_service_id: booking.serviceId,
      p_date: booking.date,
    }),
    adminClient.from('patients').select('id, first_name, last_name, email, phone').eq('dni', booking.dni).maybeSingle(),
    adminClient.from('branches').select('name').eq('id', booking.branchId).maybeSingle(),
    // El nombre del profesional vive en profiles (mismo id que professionals).
    adminClient.from('profiles').select('full_name').eq('id', booking.professionalId).maybeSingle(),
  ]);

  if (serviceResult.error || offerResult.error || slotsResult.error || patientResult.error) {
    return jsonResponse({ error: 'No se pudo verificar la disponibilidad. Inténtalo de nuevo.' }, 500);
  }
  const offerError = serviceOfferError(offerResult.data);
  if (!serviceResult.data || offerError) {
    return jsonResponse({ error: offerError ?? 'El servicio elegido ya no está disponible.' }, 400);
  }

  const startTime = booking.startTime.slice(0, 5);
  const stillAvailable = ((slotsResult.data ?? []) as { slot_start: string }[]).some(
    (slot) => slot.slot_start.slice(0, 5) === startTime,
  );
  if (!stillAvailable) {
    return jsonResponse({ error: SLOT_TAKEN }, 409);
  }

  // Regla del paciente: ese día no puede tener citas en otra sede. Un DNI
  // nuevo no tiene citas; el personal puede saltarse la regla.
  if (patientResult.data && !(await callerIsStaff(req, adminClient))) {
    const { data: sameDay, error: sameDayError } = await adminClient
      .from('appointments')
      .select('branch_id, status')
      .eq('patient_id', patientResult.data.id)
      .eq('appointment_date', booking.date);
    if (sameDayError) {
      return jsonResponse({ error: 'No se pudo verificar la disponibilidad. Inténtalo de nuevo.' }, 500);
    }
    const sameDayConflict = otherBranchSameDayError(sameDay ?? [], booking.branchId);
    if (sameDayConflict) {
      return jsonResponse({ error: sameDayConflict }, 409);
    }
  }

  // Se ignora el endTime del cliente: la duración real es la del servicio.
  const endTime = addMinutes(startTime, serviceResult.data.duration_minutes);

  let patientId: string;
  let existingPatient = patientResult.data;

  if (!existingPatient) {
    const { data: newPatient, error: createPatientError } = await adminClient
      .from('patients')
      .insert({
        dni: booking.dni,
        first_name: booking.firstName,
        last_name: booking.lastName,
        email: booking.email,
        phone: booking.phone,
      })
      .select('id')
      .single();

    if (newPatient) {
      patientId = newPatient.id;
    } else if (createPatientError?.code === '23505') {
      // Otra reserva con el mismo DNI nuevo se registró en paralelo.
      const { data: concurrentPatient } = await adminClient
        .from('patients')
        .select('id, first_name, last_name, email, phone')
        .eq('dni', booking.dni)
        .single();
      if (!concurrentPatient) {
        return jsonResponse({ error: 'No se pudo registrar el paciente.' }, 500);
      }
      existingPatient = concurrentPatient;
      patientId = concurrentPatient.id;
    } else {
      return jsonResponse({ error: 'No se pudo registrar el paciente.' }, 500);
    }
  } else {
    patientId = existingPatient.id;
  }

  // Con un DNI ya registrado y otros datos, quien reserva quizá solo conoce
  // el DNI: el código de esta cita no le abrirá las demás del paciente.
  const codeLimited = existingPatient !== null && !bookingMatchesPatient(existingPatient, booking);

  if (existingPatient) {
    const patch = missingPatientFields(existingPatient, booking);
    if (Object.keys(patch).length > 0) {
      const { error: updateError } = await adminClient.from('patients').update(patch).eq('id', patientId);
      if (updateError) {
        return jsonResponse({ error: 'No se pudieron completar los datos del paciente.' }, 500);
      }
    }
  }

  const { data: appointment, error: appointmentError } = await adminClient
    .from('appointments')
    .insert({
      patient_id: patientId,
      professional_id: booking.professionalId,
      branch_id: booking.branchId,
      service_id: booking.serviceId,
      appointment_date: booking.date,
      start_time: startTime,
      end_time: endTime,
      reason: booking.reason,
      status: 'pending',
      code_limited: codeLimited,
      // Los correos de esta cita van a quien la reservó (ver bookingRecipient).
      contact_email: booking.email,
      // service_name, service_price y service_duration_minutes los copia el
      // trigger appointments_copy_service desde el servicio.
    })
    .select('id, appointment_code, appointment_date, start_time, end_time, status')
    .single();

  if (appointmentError || !appointment) {
    const overlap = appointmentError ? overlapErrorMessage(appointmentError) : null;
    if (overlap) {
      return jsonResponse({ error: overlap }, 409);
    }
    return jsonResponse({ error: 'No se pudo registrar la cita. Inténtalo de nuevo.' }, 400);
  }

  // Al correo y nombre de quien reserva, aunque el DNI tenga otro correo
  // registrado.
  const recipient = bookingRecipient(booking);
  const email = bookingEmail({
    patientName: recipient.name,
    appointment: {
      code: appointment.appointment_code,
      date: appointment.appointment_date,
      startTime: appointment.start_time,
      branchName: branchResult.data?.name ?? null,
      professionalName: professionalResult.data?.full_name ?? null,
      serviceName: serviceResult.data.name,
    },
    siteUrl: Deno.env.get('SITE_URL') ?? null,
  });
  const emailSent = await sendEmail({ to: recipient.to, ...email });

  return jsonResponse(
    {
      id: appointment.id,
      code: appointment.appointment_code,
      emailSent,
      patientId,
      date: appointment.appointment_date,
      startTime: appointment.start_time,
      endTime: appointment.end_time,
      status: appointment.status,
    },
    201,
  );
});
