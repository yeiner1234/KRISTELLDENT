// Lógica pura de patient-appointments: sin imports de Deno ni de Supabase
// para poder probarla con Vitest (patientAppointments.test.ts).

// Un solo mensaje para cualquier fallo de identificación: quien prueba DNIs
// o códigos no debe poder saber cuál de los dos existe.
export const MISMATCH_ERROR = 'El DNI y el código no coinciden.';

// Igual exista o no el DNI: nunca revela si alguien tiene citas ni su correo.
export const RESEND_CODE_MESSAGE = 'Si el DNI tiene citas registradas, te enviamos los códigos a tu correo.';
// Envíos de códigos por DNI en una hora (tabla patient_code_email_log).
export const RESEND_CODE_LIMIT_PER_HOUR = 3;

// Mismo alfabeto que generate_appointment_code() (sin O, 0, I ni 1).
const CODE_BODY_PATTERN = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

export function normalizeAppointmentCode(raw: unknown): string | null {
  if (typeof raw !== 'string') {
    return null;
  }
  let body = raw.replace(/\s+/g, '').toUpperCase();
  if (body.length !== 6) {
    body = body.replace(/^KD-?/, '');
  }
  return CODE_BODY_PATTERN.test(body) ? `KD-${body}` : null;
}

// AAAA-MM-DD que exista en el calendario (rechaza 2026-02-30).
function isRealDate(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return false;
  }
  const parsed = new Date(`${date}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export interface PatientAppointmentsPayload {
  action?: unknown;
  dni?: unknown;
  code?: unknown;
  appointmentId?: unknown;
  date?: unknown;
  startTime?: unknown;
}

interface Identity {
  dni: string;
  code: string;
}

export type PatientRequest =
  | { action: 'resend-code'; dni: string }
  | (Identity & { action: 'list' })
  | (Identity & { action: 'cancel'; appointmentId: string })
  | (Identity & { action: 'reschedule'; appointmentId: string; date: string; startTime: string });

export type ParseResult = { ok: true; value: PatientRequest } | { ok: false; status: number; error: string };

export function parseRequest(payload: PatientAppointmentsPayload): ParseResult {
  const action = text(payload.action);
  if (action !== 'list' && action !== 'cancel' && action !== 'reschedule' && action !== 'resend-code') {
    return { ok: false, status: 400, error: 'Acción no válida.' };
  }

  const dni = text(payload.dni);

  // Sin código: es justo para quien lo perdió.
  if (action === 'resend-code') {
    return /^\d{8}$/.test(dni)
      ? { ok: true, value: { action, dni } }
      : { ok: false, status: 400, error: 'El DNI debe tener 8 dígitos.' };
  }

  const code = normalizeAppointmentCode(payload.code);
  if (!/^\d{8}$/.test(dni) || !code) {
    return { ok: false, status: 404, error: MISMATCH_ERROR };
  }

  if (action === 'list') {
    return { ok: true, value: { action, dni, code } };
  }

  const appointmentId = text(payload.appointmentId);
  if (!UUID_PATTERN.test(appointmentId)) {
    return { ok: false, status: 400, error: 'La cita indicada no es válida.' };
  }

  if (action === 'cancel') {
    return { ok: true, value: { action, dni, code, appointmentId } };
  }

  const date = text(payload.date);
  const startTime = text(payload.startTime);
  if (!isRealDate(date) || !TIME_PATTERN.test(startTime)) {
    return { ok: false, status: 400, error: 'La fecha u hora elegida no es válida.' };
  }
  return { ok: true, value: { action, dni, code, appointmentId, date, startTime: startTime.slice(0, 5) } };
}

const BLOCKED_STATUS_ERRORS: Record<string, string> = {
  completed: 'La cita ya fue atendida: no se puede modificar.',
  in_room: 'La cita ya está en atención: no se puede modificar.',
  cancelled: 'La cita ya está cancelada: no se puede modificar.',
};

// El trigger guard_appointment_changes es la garantía final; esto da un
// mensaje claro antes de intentar el UPDATE y cubre la fecha u hora pasada
// (nowLima en hora de Lima).
export function modificationError(
  appointment: { status: string; appointment_date: string; start_time: string },
  nowLima: { date: string; time: string },
): string | null {
  if (appointment.status !== 'pending' && appointment.status !== 'confirmed') {
    return BLOCKED_STATUS_ERRORS[appointment.status] ?? 'Esta cita no se puede modificar.';
  }
  if (appointment.appointment_date < nowLima.date) {
    return 'La cita es de una fecha pasada: no se puede modificar.';
  }
  if (appointment.appointment_date === nowLima.date && appointment.start_time.slice(0, 5) <= nowLima.time) {
    return 'La hora de la cita ya pasó: no se puede modificar.';
  }
  return null;
}

// Un código limitado (cita reservada con un DNI existente y otros datos) solo
// abre su propia cita; uno completo abre todas las del paciente.
export function canAccessAppointment(access: { limitedToAppointmentId: string | null }, appointmentId: string): boolean {
  return access.limitedToAppointmentId === null || access.limitedToAppointmentId === appointmentId;
}

// P0001 = raise exception del trigger: su mensaje ya está en español.
export function triggerErrorMessage(error: { code?: string; message?: string }): string | null {
  return error.code === 'P0001' && error.message ? error.message : null;
}

interface ServiceSnapshotRow {
  service_id: string | null;
  service_name: string | null;
  service_duration_minutes: number | null;
}

// El historial muestra el servicio tal como se reservó (copia en la cita).
// Las citas anteriores a esa copia usan el servicio actual.
export function serviceSnapshot(
  row: ServiceSnapshotRow,
  currentServices: Map<string, { name: string; duration_minutes: number }>,
): { serviceName: string | null; serviceDuration: number | null } {
  const current = row.service_id ? currentServices.get(row.service_id) : undefined;
  return {
    serviceName: row.service_name ?? current?.name ?? null,
    serviceDuration: row.service_duration_minutes ?? current?.duration_minutes ?? null,
  };
}
