// Lógica pura de appointment-emails: sin imports de Deno ni de Supabase para
// poder probarla con Vitest (appointmentEmails.test.ts).
import { cancelledEmail, rescheduledEmail, type EmailAppointment } from '../_shared/emailTemplates.ts';

// HU14: el recordatorio sale 24 horas antes de la cita.
export const REMINDER_LEAD_MS = 24 * 60 * 60 * 1000;

// Estados que se recuerdan: citas reservadas o reprogramadas que siguen vigentes.
const REMINDER_STATUSES = ['pending', 'confirmed'];

// Perú no tiene horario de verano: Lima es siempre UTC-5.
const LIMA_OFFSET = '-05:00';

// Instante (ms) en que empieza una cita guardada con fecha y hora de Lima.
export function limaStartInstant(date: string, startTime: string): number {
  return Date.parse(`${date}T${startTime.slice(0, 5)}:00${LIMA_OFFSET}`);
}

export interface ReminderCandidate {
  status: string;
  appointment_date: string;
  start_time: string;
  // Cuándo se reservó o reprogramó la cita por última vez.
  scheduled_at: string;
  reminder_sent_at: string | null;
}

// Toca recordar si faltan 24 horas o menos y la cita no empezó (si un envío
// se atrasa, sale igual), la cita sigue vigente, no se recordó ya y se
// reservó con al menos 24 horas de anticipación (caso límite 2).
export function isReminderDue(appointment: ReminderCandidate, now: Date): boolean {
  if (!REMINDER_STATUSES.includes(appointment.status) || appointment.reminder_sent_at) {
    return false;
  }
  const start = limaStartInstant(appointment.appointment_date, appointment.start_time);
  const nowMs = now.getTime();
  if (start <= nowMs || start - nowMs > REMINDER_LEAD_MS) {
    return false;
  }
  return start - Date.parse(appointment.scheduled_at) >= REMINDER_LEAD_MS;
}

// La función la llaman pg_net y pg_cron con un secreto compartido.
// Comparación de tiempo constante para no filtrar el secreto por tiempos.
export function isAuthorized(provided: string | null, secret: string | undefined): boolean {
  if (!secret || provided === null || provided.length !== secret.length) {
    return false;
  }
  let difference = 0;
  for (let index = 0; index < secret.length; index += 1) {
    difference |= provided.charCodeAt(index) ^ secret.charCodeAt(index);
  }
  return difference === 0;
}

export type NotificationKind = 'rescheduled' | 'cancelled';

export function notificationEmail(
  kind: NotificationKind,
  input: { patientName: string; appointment: EmailAppointment; siteUrl: string | null },
) {
  return kind === 'cancelled' ? cancelledEmail(input) : rescheduledEmail(input);
}

// Avisos y recordatorios van al correo con que se reservó la cita; las citas
// anteriores a contact_email usan el correo registrado del paciente.
export function notificationRecipient(contactEmail: string | null, patientEmail: string | null): string | null {
  return contactEmail?.trim() || patientEmail?.trim() || null;
}
