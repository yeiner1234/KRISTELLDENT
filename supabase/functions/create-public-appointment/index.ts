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
import { createClient } from 'jsr:@supabase/supabase-js@2';
import {
  addMinutes,
  limaToday,
  missingPatientFields,
  overlapErrorMessage,
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

  // Las tres lecturas son independientes: van en paralelo para que la
  // reserva se confirme en menos de 3 s.
  const [serviceResult, slotsResult, patientResult] = await Promise.all([
    adminClient.from('services').select('duration_minutes').eq('id', booking.serviceId).maybeSingle(),
    // get_available_slots ya comprueba que la profesional esté activa,
    // atienda en esa sede y ofrezca ese servicio.
    adminClient.rpc('get_available_slots', {
      p_professional_id: booking.professionalId,
      p_branch_id: booking.branchId,
      p_service_id: booking.serviceId,
      p_date: booking.date,
    }),
    adminClient.from('patients').select('id, first_name, last_name, email, phone').eq('dni', booking.dni).maybeSingle(),
  ]);

  if (serviceResult.error || slotsResult.error || patientResult.error) {
    return jsonResponse({ error: 'No se pudo verificar la disponibilidad. Inténtalo de nuevo.' }, 500);
  }
  if (!serviceResult.data) {
    return jsonResponse({ error: 'El servicio elegido no existe.' }, 400);
  }

  const startTime = booking.startTime.slice(0, 5);
  const stillAvailable = ((slotsResult.data ?? []) as { slot_start: string }[]).some(
    (slot) => slot.slot_start.slice(0, 5) === startTime,
  );
  if (!stillAvailable) {
    return jsonResponse({ error: SLOT_TAKEN }, 409);
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

  return jsonResponse(
    {
      id: appointment.id,
      code: appointment.appointment_code,
      patientId,
      date: appointment.appointment_date,
      startTime: appointment.start_time,
      endTime: appointment.end_time,
      status: appointment.status,
    },
    201,
  );
});
