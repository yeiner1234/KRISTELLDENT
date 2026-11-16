// Edge Function: patient-appointments
//
// Única vía pública para que un paciente (sin cuenta) vea, cancele o
// reprograme SUS citas. Se identifica con DNI + código de una de sus citas:
// el código hace de contraseña, así que saber solo un DNI no da acceso a nada.
// patients/appointments no tienen policies de lectura ni escritura para
// `anon`; esta función lee y escribe con service_role, pero siempre limitada
// al paciente que se identificó.
//
// Las garantías finales siguen en la base de datos: el trigger
// guard_appointment_changes (no se modifica una cita atendida o cancelada) y
// las restricciones appointments_no_overlap / appointments_no_patient_overlap.
//
// La validación vive en patientAppointments.ts (probada con Vitest).
import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2';
import { addMinutes, limaToday, overlapErrorMessage } from '../create-public-appointment/booking.ts';
import {
  MISMATCH_ERROR,
  modificationError,
  parseRequest,
  triggerErrorMessage,
  type PatientAppointmentsPayload,
} from './patientAppointments.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SLOT_TAKEN = 'Ese horario ya no está disponible. Elige otro.';
// Igual que get_available_slots cuando la cita no tiene servicio.
const DEFAULT_DURATION_MINUTES = 30;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

interface AppointmentRow {
  id: string;
  appointment_code: string;
  professional_id: string;
  branch_id: string;
  service_id: string | null;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: string;
}

const APPOINTMENT_COLUMNS =
  'id, appointment_code, professional_id, branch_id, service_id, appointment_date, start_time, end_time, status';

// Devuelve el paciente dueño de la cita `code` solo si su DNI es `dni`.
async function findPatient(client: SupabaseClient, dni: string, code: string) {
  const { data: appointment, error } = await client
    .from('appointments')
    .select('patient_id')
    .eq('appointment_code', code)
    .maybeSingle();
  if (error) throw error;
  if (!appointment) return null;

  const { data: patient, error: patientError } = await client
    .from('patients')
    .select('id, first_name, last_name')
    .eq('id', appointment.patient_id)
    .eq('dni', dni)
    .maybeSingle();
  if (patientError) throw patientError;
  return patient;
}

async function listAppointments(client: SupabaseClient, patientId: string) {
  const { data, error } = await client
    .from('appointments')
    .select(APPOINTMENT_COLUMNS)
    .eq('patient_id', patientId)
    .order('appointment_date', { ascending: false })
    .order('start_time', { ascending: false });
  if (error) throw error;

  const rows = (data ?? []) as AppointmentRow[];
  const unique = (ids: (string | null)[]) => [...new Set(ids.filter((id): id is string => Boolean(id)))];

  // El nombre del profesional vive en profiles (mismo id que professionals).
  const [branches, profiles, services] = await Promise.all([
    client.from('branches').select('id, name').in('id', unique(rows.map((row) => row.branch_id))),
    client.from('profiles').select('id, full_name').in('id', unique(rows.map((row) => row.professional_id))),
    client.from('services').select('id, name, duration_minutes').in('id', unique(rows.map((row) => row.service_id))),
  ]);
  if (branches.error) throw branches.error;
  if (profiles.error) throw profiles.error;
  if (services.error) throw services.error;

  const branchName = new Map((branches.data ?? []).map((row) => [row.id, row.name as string]));
  const professionalName = new Map((profiles.data ?? []).map((row) => [row.id, row.full_name as string]));
  const serviceById = new Map((services.data ?? []).map((row) => [row.id, row]));

  return rows.map((row) => {
    const service = row.service_id ? serviceById.get(row.service_id) : undefined;
    return {
      id: row.id,
      code: row.appointment_code,
      date: row.appointment_date,
      startTime: row.start_time.slice(0, 5),
      endTime: row.end_time.slice(0, 5),
      status: row.status,
      branchId: row.branch_id,
      branchName: branchName.get(row.branch_id) ?? null,
      professionalId: row.professional_id,
      professionalName: professionalName.get(row.professional_id) ?? null,
      serviceId: row.service_id,
      serviceName: (service?.name as string | undefined) ?? null,
      serviceDuration: (service?.duration_minutes as number | undefined) ?? null,
    };
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Método no permitido.' }, 405);
  }

  let payload: PatientAppointmentsPayload;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: 'Cuerpo de la solicitud inválido.' }, 400);
  }

  const parsed = parseRequest(payload ?? {});
  if (!parsed.ok) {
    return jsonResponse({ error: parsed.error }, parsed.status);
  }
  const request = parsed.value;

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SB_SECRET_KEY');

  if (!serviceRoleKey) {
    return jsonResponse({ error: 'La función no está configurada correctamente (falta SB_SECRET_KEY).' }, 500);
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  try {
    const patient = await findPatient(adminClient, request.dni, request.code);
    if (!patient) {
      return jsonResponse({ error: MISMATCH_ERROR }, 404);
    }

    if (request.action === 'list') {
      const appointments = await listAppointments(adminClient, patient.id);
      return jsonResponse({
        patient: { firstName: patient.first_name, lastName: patient.last_name },
        appointments,
      });
    }

    // La cita a modificar tiene que ser de este paciente: si no, mismo 404.
    const { data: target, error: targetError } = await adminClient
      .from('appointments')
      .select(APPOINTMENT_COLUMNS)
      .eq('id', request.appointmentId)
      .eq('patient_id', patient.id)
      .maybeSingle();
    if (targetError) throw targetError;
    if (!target) {
      return jsonResponse({ error: MISMATCH_ERROR }, 404);
    }

    const today = limaToday();
    const blocked = modificationError(target, today);
    if (blocked) {
      return jsonResponse({ error: blocked }, 409);
    }

    if (request.action === 'cancel') {
      const { error } = await adminClient.from('appointments').update({ status: 'cancelled' }).eq('id', target.id);
      if (error) {
        const message = triggerErrorMessage(error);
        if (message) return jsonResponse({ error: message }, 409);
        throw error;
      }
      return jsonResponse({ id: target.id, status: 'cancelled' });
    }

    if (request.date < today) {
      return jsonResponse({ error: 'No se puede reprogramar a una fecha pasada.' }, 400);
    }

    const [serviceResult, slotsResult] = await Promise.all([
      target.service_id
        ? adminClient.from('services').select('duration_minutes').eq('id', target.service_id).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      adminClient.rpc('get_available_slots', {
        p_professional_id: target.professional_id,
        p_branch_id: target.branch_id,
        p_service_id: target.service_id,
        p_date: request.date,
        p_exclude_appointment_id: target.id,
      }),
    ]);
    if (serviceResult.error) throw serviceResult.error;
    if (slotsResult.error) throw slotsResult.error;

    const isFree = ((slotsResult.data ?? []) as { slot_start: string }[]).some(
      (slot) => slot.slot_start.slice(0, 5) === request.startTime,
    );
    if (!isFree) {
      return jsonResponse({ error: SLOT_TAKEN }, 409);
    }

    const duration = serviceResult.data?.duration_minutes ?? DEFAULT_DURATION_MINUTES;
    const endTime = addMinutes(request.startTime, duration);

    const { data: updated, error: updateError } = await adminClient
      .from('appointments')
      .update({ appointment_date: request.date, start_time: request.startTime, end_time: endTime })
      .eq('id', target.id)
      .select('id, appointment_date, start_time, end_time, status')
      .single();

    if (updateError || !updated) {
      const message = updateError ? (overlapErrorMessage(updateError) ?? triggerErrorMessage(updateError)) : null;
      if (message) return jsonResponse({ error: message }, 409);
      return jsonResponse({ error: 'No se pudo reprogramar la cita. Inténtalo de nuevo.' }, 500);
    }

    return jsonResponse({
      id: updated.id,
      date: updated.appointment_date,
      startTime: updated.start_time.slice(0, 5),
      endTime: updated.end_time.slice(0, 5),
      status: updated.status,
    });
  } catch {
    return jsonResponse({ error: 'No se pudo completar la operación. Inténtalo de nuevo.' }, 500);
  }
});
