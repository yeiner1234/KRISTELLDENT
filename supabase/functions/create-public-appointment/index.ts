// Edge Function: create-public-appointment
//
// Única vía autorizada para que un paciente (sin cuenta, sin login) cree una
// cita real. Corre en el servidor porque:
//   - patients/appointments no tienen policy de INSERT para `anon` (FASE 9,
//     a propósito: un paciente anónimo no debe poder escribir directo ahí).
//   - crear/actualizar el paciente por DNI y crear la cita deben pasar
//     siempre por la misma validación server-side, nunca por lo que el
//     cliente decida enviar.
//
// La seguridad real contra choques de horario NO vive aquí: vive en la
// restricción de exclusión `appointments_no_overlap` de la base de datos
// (ver migración de disponibilidad). Esta función solo intenta el INSERT y
// traduce el error de esa restricción a un mensaje entendible — así que es
// segura incluso si dos personas reservan el mismo horario al mismo
// milisegundo exacto.
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateAppointmentPayload {
  dni?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  professionalId?: string;
  branchId?: string;
  serviceId?: string | null;
  date?: string;
  startTime?: string;
  endTime?: string;
  reason?: string;
}

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

  const dni = payload.dni?.trim();
  const firstName = payload.firstName?.trim();
  const lastName = payload.lastName?.trim();
  const email = payload.email?.trim() || null;
  const phone = payload.phone?.trim() || null;
  const professionalId = payload.professionalId;
  const branchId = payload.branchId;
  const serviceId = payload.serviceId ?? null;
  const date = payload.date;
  const startTime = payload.startTime;
  const endTime = payload.endTime;
  const reason = payload.reason?.trim() || null;

  if (!dni || !firstName || !lastName || !professionalId || !branchId || !date || !startTime || !endTime) {
    return jsonResponse({ error: 'Faltan datos obligatorios para reservar la cita.' }, 400);
  }

  if (!/^\d{8}$/.test(dni)) {
    return jsonResponse({ error: 'El DNI debe tener 8 dígitos.' }, 400);
  }

  const todayIso = new Date().toISOString().slice(0, 10);
  if (date < todayIso) {
    return jsonResponse({ error: 'No se puede reservar una fecha pasada.' }, 400);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SB_SECRET_KEY');

  if (!serviceRoleKey) {
    return jsonResponse({ error: 'La función no está configurada correctamente (falta SB_SECRET_KEY).' }, 500);
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  // Verificación adicional (no es la protección real, solo un mejor mensaje
  // de error): confirma que el horario pedido sigue dentro de lo que el
  // motor de disponibilidad considera libre en este instante.
  const { data: freeSlots, error: slotsError } = await adminClient.rpc('get_available_slots', {
    p_professional_id: professionalId,
    p_branch_id: branchId,
    p_service_id: serviceId,
    p_date: date,
  });

  if (slotsError) {
    return jsonResponse({ error: 'No se pudo verificar la disponibilidad.' }, 500);
  }

  const normalizedStart = startTime.slice(0, 5);
  const stillAvailable = (freeSlots ?? []).some(
    (slot: { slot_start: string }) => slot.slot_start.slice(0, 5) === normalizedStart,
  );

  if (!stillAvailable) {
    return jsonResponse({ error: 'Ese horario ya no está disponible. Por favor elige otro.' }, 409);
  }

  const { data: existingPatient, error: findPatientError } = await adminClient
    .from('patients')
    .select('id')
    .eq('dni', dni)
    .maybeSingle();

  if (findPatientError) {
    return jsonResponse({ error: findPatientError.message }, 500);
  }

  let patientId: string;

  if (existingPatient) {
    patientId = existingPatient.id;
    const { error: updateError } = await adminClient
      .from('patients')
      .update({ first_name: firstName, last_name: lastName, email, phone })
      .eq('id', patientId);

    if (updateError) {
      return jsonResponse({ error: updateError.message }, 500);
    }
  } else {
    const { data: newPatient, error: createPatientError } = await adminClient
      .from('patients')
      .insert({ dni, first_name: firstName, last_name: lastName, email, phone })
      .select('id')
      .single();

    if (createPatientError || !newPatient) {
      return jsonResponse({ error: createPatientError?.message ?? 'No se pudo registrar el paciente.' }, 500);
    }
    patientId = newPatient.id;
  }

  const { data: appointment, error: appointmentError } = await adminClient
    .from('appointments')
    .insert({
      patient_id: patientId,
      professional_id: professionalId,
      branch_id: branchId,
      service_id: serviceId,
      appointment_date: date,
      start_time: startTime,
      end_time: endTime,
      reason,
      status: 'pending',
    })
    .select('id, appointment_date, start_time, end_time, status')
    .single();

  if (appointmentError) {
    // 23P01 = exclusion_violation: alguien más reservó este horario justo
    // antes. Esta es la protección real, no la verificación de arriba.
    if (appointmentError.code === '23P01') {
      return jsonResponse({ error: 'Ese horario ya no está disponible. Por favor elige otro.' }, 409);
    }
    return jsonResponse({ error: appointmentError.message }, 400);
  }

  return jsonResponse(
    {
      id: appointment.id,
      patientId,
      date: appointment.appointment_date,
      startTime: appointment.start_time,
      endTime: appointment.end_time,
      status: appointment.status,
    },
    201,
  );
});
