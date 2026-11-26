// Edge Function: appointment-emails
//
// Envía los correos que no dependen de una pantalla:
// - HU13: avisos de cita reprogramada o cancelada. El trigger
//   enqueue_appointment_email deja la fila en appointment_email_outbox venga
//   el cambio del paciente (patient-appointments) o del personal (panel), y
//   llama a esta función con pg_net en cuanto se guarda el cambio.
// - HU14: recordatorios 24 horas antes de la cita. pg_cron llama a esta
//   función cada 10 minutos; esa misma llamada reintenta los avisos que
//   fallaron.
//
// No la llama el navegador: exige el encabezado x-cron-secret con el secreto
// APPOINTMENT_EMAILS_SECRET (el mismo que está en Vault como
// appointment_emails_secret). Se despliega con --no-verify-jwt.
// La lógica de cuándo toca recordar vive en appointmentEmails.ts (Vitest).
import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2';
import { limaToday } from '../create-public-appointment/booking.ts';
import { sendEmail } from '../_shared/email.ts';
import { reminderEmail, type EmailAppointment } from '../_shared/emailTemplates.ts';
import { isAuthorized, isReminderDue, notificationEmail, type NotificationKind, type ReminderCandidate } from './appointmentEmails.ts';

// Filas por llamada: con 3000 citas al mes en las 4 sedes alcanza de sobra.
const BATCH_SIZE = 50;
// Un aviso que falla se reintenta en las siguientes llamadas hasta 5 veces.
const MAX_ATTEMPTS = 5;
// Si una llamada se cayó a mitad de un envío, otra lo retoma pasado este tiempo.
const STALE_CLAIM_MS = 5 * 60 * 1000;
const NO_EMAIL = 'El paciente no tiene correo registrado.';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

interface LoadedAppointment {
  patientName: string;
  email: string | null;
  appointment: EmailAppointment;
}

// Cita con los datos que lleva el correo (HU13 criterio 2: fecha, hora, sede,
// profesional y código).
async function loadAppointment(client: SupabaseClient, appointmentId: string): Promise<LoadedAppointment | null> {
  const { data: row, error } = await client
    .from('appointments')
    .select('appointment_code, appointment_date, start_time, branch_id, professional_id, service_id, service_name, patient_id')
    .eq('id', appointmentId)
    .maybeSingle();
  if (error) throw error;
  if (!row) return null;

  const [patient, branch, profile, service] = await Promise.all([
    client.from('patients').select('first_name, email').eq('id', row.patient_id).maybeSingle(),
    client.from('branches').select('name').eq('id', row.branch_id).maybeSingle(),
    // El nombre del profesional vive en profiles (mismo id que professionals).
    client.from('profiles').select('full_name').eq('id', row.professional_id).maybeSingle(),
    row.service_name || !row.service_id
      ? Promise.resolve({ data: null, error: null })
      : client.from('services').select('name').eq('id', row.service_id).maybeSingle(),
  ]);
  for (const result of [patient, branch, profile, service]) {
    if (result.error) throw result.error;
  }

  return {
    patientName: patient.data?.first_name ?? '',
    email: patient.data?.email?.trim() || null,
    appointment: {
      code: row.appointment_code,
      date: row.appointment_date,
      startTime: row.start_time.slice(0, 5),
      branchName: branch.data?.name ?? null,
      professionalName: profile.data?.full_name ?? null,
      serviceName: row.service_name ?? service.data?.name ?? null,
    },
  };
}

interface OutboxRow {
  id: string;
  appointment_id: string;
  kind: NotificationKind;
  attempts: number;
}

// HU13: avisos de reprogramación y cancelación pendientes.
async function processOutbox(client: SupabaseClient, siteUrl: string | null): Promise<number> {
  const staleBefore = new Date(Date.now() - STALE_CLAIM_MS).toISOString();
  const { data, error } = await client
    .from('appointment_email_outbox')
    .select('id, appointment_id, kind, attempts')
    .is('sent_at', null)
    .lt('attempts', MAX_ATTEMPTS)
    .or(`processing_started_at.is.null,processing_started_at.lt."${staleBefore}"`)
    .order('created_at', { ascending: true })
    .limit(BATCH_SIZE);
  if (error) throw error;

  let sent = 0;
  for (const item of (data ?? []) as OutboxRow[]) {
    // Se toma la fila solo si nadie la tomó entre la lectura y ahora (la
    // llamada del trigger y la de pg_cron pueden coincidir).
    const { data: claimed, error: claimError } = await client
      .from('appointment_email_outbox')
      .update({ attempts: item.attempts + 1, processing_started_at: new Date().toISOString() })
      .eq('id', item.id)
      .eq('attempts', item.attempts)
      .is('sent_at', null)
      .select('id')
      .maybeSingle();
    if (claimError) throw claimError;
    if (!claimed) continue;

    let lastError: string | null = null;
    let done = false;
    try {
      const loaded = await loadAppointment(client, item.appointment_id);
      if (!loaded || !loaded.email) {
        // Nada que enviar: se cierra para no reintentar.
        done = true;
        lastError = loaded ? NO_EMAIL : 'La cita ya no existe.';
      } else {
        const email = notificationEmail(item.kind, { patientName: loaded.patientName, appointment: loaded.appointment, siteUrl });
        done = await sendEmail({ to: loaded.email, ...email });
        lastError = done ? null : 'No se pudo enviar el correo.';
        if (done) sent += 1;
      }
    } catch (caught) {
      lastError = caught instanceof Error ? caught.message : 'Error al preparar el correo.';
    }

    const { error: finishError } = await client
      .from('appointment_email_outbox')
      .update({ sent_at: done ? new Date().toISOString() : null, processing_started_at: null, last_error: lastError })
      .eq('id', item.id);
    if (finishError) throw finishError;
  }
  return sent;
}

// HU14: recordatorios de las citas que empiezan en las próximas 24 horas.
async function processReminders(client: SupabaseClient, siteUrl: string | null, now: Date): Promise<number> {
  const today = limaToday(now);
  const tomorrow = limaToday(new Date(now.getTime() + 24 * 60 * 60 * 1000));
  const { data, error } = await client
    .from('appointments')
    .select('id, status, appointment_date, start_time, scheduled_at, reminder_sent_at')
    .in('status', ['pending', 'confirmed'])
    .is('reminder_sent_at', null)
    .gte('appointment_date', today)
    .lte('appointment_date', tomorrow)
    .limit(500);
  if (error) throw error;

  let sent = 0;
  const due = ((data ?? []) as (ReminderCandidate & { id: string })[]).filter((row) => isReminderDue(row, now));
  for (const row of due) {
    // Se marca antes de enviar: dos llamadas a la vez no mandan dos correos.
    const { data: claimed, error: claimError } = await client
      .from('appointments')
      .update({ reminder_sent_at: new Date().toISOString() })
      .eq('id', row.id)
      .is('reminder_sent_at', null)
      .select('id')
      .maybeSingle();
    if (claimError) throw claimError;
    if (!claimed) continue;

    let delivered = false;
    let hasEmail = true;
    try {
      const loaded = await loadAppointment(client, row.id);
      hasEmail = Boolean(loaded?.email);
      if (loaded?.email) {
        const email = reminderEmail({ patientName: loaded.patientName, appointment: loaded.appointment, siteUrl });
        delivered = await sendEmail({ to: loaded.email, ...email });
      }
    } catch (caught) {
      console.error('Recordatorio no preparado:', caught);
    }

    if (delivered) {
      sent += 1;
    } else if (hasEmail) {
      // Falló el envío: se libera para reintentar en la siguiente llamada.
      await client.from('appointments').update({ reminder_sent_at: null }).eq('id', row.id);
    }
  }
  return sent;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Método no permitido.' }, 405);
  }
  if (!isAuthorized(req.headers.get('x-cron-secret'), Deno.env.get('APPOINTMENT_EMAILS_SECRET'))) {
    return jsonResponse({ error: 'No autorizado.' }, 401);
  }

  const serviceRoleKey = Deno.env.get('SB_SECRET_KEY');
  if (!serviceRoleKey) {
    return jsonResponse({ error: 'La función no está configurada correctamente (falta SB_SECRET_KEY).' }, 500);
  }
  const client = createClient(Deno.env.get('SUPABASE_URL')!, serviceRoleKey);
  const siteUrl = Deno.env.get('SITE_URL') ?? null;

  try {
    const notifications = await processOutbox(client, siteUrl);
    const reminders = await processReminders(client, siteUrl, new Date());
    return jsonResponse({ notifications, reminders });
  } catch (error) {
    console.error('appointment-emails falló:', error);
    return jsonResponse({ error: 'No se pudieron procesar los correos.' }, 500);
  }
});
