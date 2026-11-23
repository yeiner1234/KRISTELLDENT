// Edge Function: patient-appointments
//
// Única vía pública para que un paciente (sin cuenta) vea, cancele o
// reprograme SUS citas. Se identifica con DNI + código de una de sus citas:
// el código hace de contraseña. Como cualquiera puede reservar con un DNI
// ajeno, el código de una cita marcada code_limited solo abre esa cita (ver
// create-public-appointment); el paciente ve todas con el código de una cita
// que reservó con sus datos registrados.
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
import {
  addMinutes,
  limaNow,
  limaToday,
  overlapErrorMessage,
  serviceOfferError,
} from '../create-public-appointment/booking.ts';
import { sendEmail } from '../_shared/email.ts';
import { appointmentCodesEmail } from '../_shared/emailTemplates.ts';
import {
  canAccessAppointment,
  MISMATCH_ERROR,
  RESEND_CODE_LIMIT_PER_HOUR,
  RESEND_CODE_MESSAGE,
  modificationError,
  parseRequest,
  serviceSnapshot,
  triggerErrorMessage,
  type PatientAppointmentsPayload,
} from './patientAppointments.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SLOT_TAKEN = 'Ese horario ya no está disponible. Elige otro.';
// La cita cambió de estado entre la lectura y el UPDATE (p. ej. recepción la pasó a "en sala").
const STATE_CHANGED = 'La cita cambió de estado y ya no se puede modificar. Vuelve a cargar tus citas.';
const ACTIVE_STATUSES = ['pending', 'confirmed'];

// Supabase Edge Runtime: termina el trabajo después de responder.
declare const EdgeRuntime: { waitUntil(promise: Promise<unknown>): void } | undefined;
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
  service_name: string | null;
  service_duration_minutes: number | null;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: string;
}

const APPOINTMENT_COLUMNS =
  'id, appointment_code, professional_id, branch_id, service_id, service_name, service_duration_minutes, appointment_date, start_time, end_time, status';

interface PatientAccess {
  patient: { id: string; first_name: string; last_name: string };
  // Código limitado: solo da acceso a esta cita.
  limitedToAppointmentId: string | null;
}

// Devuelve el paciente dueño de la cita `code` solo si su DNI es `dni`, y
// hasta dónde llega el acceso de ese código.
async function findPatient(client: SupabaseClient, dni: string, code: string): Promise<PatientAccess | null> {
  const { data: appointment, error } = await client
    .from('appointments')
    .select('id, patient_id, code_limited')
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
  if (!patient) return null;

  return { patient, limitedToAppointmentId: appointment.code_limited ? appointment.id : null };
}

async function listAppointments(client: SupabaseClient, access: PatientAccess) {
  let query = client.from('appointments').select(APPOINTMENT_COLUMNS).eq('patient_id', access.patient.id);
  if (access.limitedToAppointmentId) {
    query = query.eq('id', access.limitedToAppointmentId);
  }
  const { data, error } = await query
    .order('appointment_date', { ascending: false })
    .order('start_time', { ascending: false });
  if (error) throw error;

  return withNames(client, (data ?? []) as AppointmentRow[]);
}

// Agrega nombre de sede, profesional y servicio a cada cita.
async function withNames(client: SupabaseClient, rows: AppointmentRow[]) {
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
  const serviceById = new Map(
    (services.data ?? []).map((row) => [
      row.id as string,
      { name: row.name as string, duration_minutes: row.duration_minutes as number },
    ]),
  );

  return rows.map((row) => {
    const service = serviceSnapshot(row, serviceById);
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
      serviceName: service.serviceName,
      serviceDuration: service.serviceDuration,
    };
  });
}

// Envía los códigos de las próximas citas al correo registrado del DNI. La
// respuesta es siempre la misma (RESEND_CODE_MESSAGE): quien llama no sabe si
// el DNI existe, si tiene citas ni a qué correo se envió.
async function resendCodes(client: SupabaseClient, dni: string): Promise<void> {
  // Primero se registra y después se cuenta (incluido este pedido): dos
  // pedidos simultáneos no pueden ver los dos "todavía hay cupo".
  const { error: logError } = await client.from('patient_code_email_log').insert({ dni });
  if (logError) throw logError;

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count, error: countError } = await client
    .from('patient_code_email_log')
    .select('id', { count: 'exact', head: true })
    .eq('dni', dni)
    .gte('requested_at', oneHourAgo);
  if (countError) throw countError;

  // Limpieza de todos los DNIs: lo de más de un día ya no cuenta para el límite.
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  await client.from('patient_code_email_log').delete().lt('requested_at', oneDayAgo);

  if ((count ?? 0) > RESEND_CODE_LIMIT_PER_HOUR) {
    return;
  }

  const { data: patient, error: patientError } = await client
    .from('patients')
    .select('id, first_name, email')
    .eq('dni', dni)
    .maybeSingle();
  if (patientError) throw patientError;
  if (!patient?.email) {
    return;
  }

  const { data, error } = await client
    .from('appointments')
    .select(APPOINTMENT_COLUMNS)
    .eq('patient_id', patient.id)
    .in('status', ACTIVE_STATUSES)
    .gte('appointment_date', limaToday())
    .order('appointment_date', { ascending: true })
    .order('start_time', { ascending: true });
  if (error) throw error;
  if (!data || data.length === 0) {
    return;
  }

  const appointments = await withNames(client, data as AppointmentRow[]);
  const email = appointmentCodesEmail({
    patientName: patient.first_name,
    appointments,
    siteUrl: Deno.env.get('SITE_URL') ?? null,
  });
  await sendEmail({ to: patient.email, ...email });
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
    if (request.action === 'resend-code') {
      // Se responde sin esperar: el tiempo de respuesta no debe revelar si el
      // DNI tiene citas (con citas se consulta más y se espera a Resend).
      const work = resendCodes(adminClient, request.dni).catch((error) => {
        console.error('resend-code falló:', error);
      });
      if (typeof EdgeRuntime !== 'undefined') {
        EdgeRuntime.waitUntil(work);
      } else {
        await work;
      }
      return jsonResponse({ message: RESEND_CODE_MESSAGE });
    }

    const access = await findPatient(adminClient, request.dni, request.code);
    if (!access) {
      return jsonResponse({ error: MISMATCH_ERROR }, 404);
    }
    const { patient } = access;

    if (request.action === 'list') {
      const appointments = await listAppointments(adminClient, access);
      // Con un código limitado no se entrega el nombre registrado: quien
      // reservó quizá solo conocía el DNI.
      return jsonResponse({
        patient: access.limitedToAppointmentId
          ? { firstName: '', lastName: '' }
          : { firstName: patient.first_name, lastName: patient.last_name },
        appointments,
      });
    }

    // La cita a modificar tiene que ser de este paciente y estar al alcance
    // del código: si no, mismo 404.
    if (!canAccessAppointment(access, request.appointmentId)) {
      return jsonResponse({ error: MISMATCH_ERROR }, 404);
    }
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

    const now = limaNow();
    const blocked = modificationError(target, now);
    if (blocked) {
      return jsonResponse({ error: blocked }, 409);
    }

    // El UPDATE repite la condición de estado: si recepción la pasó a "en
    // sala" después de la lectura, no se toca (el trigger sí permitiría
    // in_room → cancelled).
    if (request.action === 'cancel') {
      const { data: cancelled, error } = await adminClient
        .from('appointments')
        .update({ status: 'cancelled' })
        .eq('id', target.id)
        .in('status', ACTIVE_STATUSES)
        .select('id')
        .maybeSingle();
      if (error) {
        const message = triggerErrorMessage(error);
        if (message) return jsonResponse({ error: message }, 409);
        throw error;
      }
      if (!cancelled) {
        return jsonResponse({ error: STATE_CHANGED }, 409);
      }
      return jsonResponse({ id: target.id, status: 'cancelled' });
    }

    if (request.date < now.date) {
      return jsonResponse({ error: 'No se puede reprogramar a una fecha pasada.' }, 400);
    }

    const [serviceResult, offerResult, slotsResult] = await Promise.all([
      target.service_id
        ? adminClient.from('services').select('duration_minutes').eq('id', target.service_id).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      // Igual que al reservar: el servicio sigue siendo de esa sede, reservable
      // y atendido por esa profesional.
      target.service_id
        ? adminClient.rpc('is_bookable_service', {
            p_branch_id: target.branch_id,
            p_service_id: target.service_id,
            p_professional_id: target.professional_id,
          })
        : Promise.resolve({ data: true, error: null }),
      adminClient.rpc('get_available_slots', {
        p_professional_id: target.professional_id,
        p_branch_id: target.branch_id,
        p_service_id: target.service_id,
        p_date: request.date,
        p_exclude_appointment_id: target.id,
      }),
    ]);
    if (serviceResult.error) throw serviceResult.error;
    if (offerResult.error) throw offerResult.error;
    if (slotsResult.error) throw slotsResult.error;

    const offerError = serviceOfferError(offerResult.data);
    if (offerError) {
      return jsonResponse({ error: offerError }, 409);
    }

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
      .in('status', ACTIVE_STATUSES)
      .select('id, appointment_date, start_time, end_time, status')
      .maybeSingle();

    if (updateError) {
      const message = overlapErrorMessage(updateError) ?? triggerErrorMessage(updateError);
      if (message) return jsonResponse({ error: message }, 409);
      return jsonResponse({ error: 'No se pudo reprogramar la cita. Inténtalo de nuevo.' }, 500);
    }
    if (!updated) {
      return jsonResponse({ error: STATE_CHANGED }, 409);
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
