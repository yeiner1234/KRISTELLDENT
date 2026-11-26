// Lógica pura de create-public-appointment: sin imports de Deno ni de
// Supabase para poder probarla con Vitest (booking.test.ts).

export interface CreateAppointmentPayload {
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
  // El cliente puede mandarlo, pero se ignora: la duración sale del servicio.
  endTime?: string;
  reason?: string;
}

export interface ValidBooking {
  dni: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  professionalId: string;
  branchId: string;
  serviceId: string;
  date: string;
  startTime: string;
  reason: string | null;
}

export type ValidationResult = { ok: true; value: ValidBooking } | { ok: false; error: string };

// Un campo que no es texto (número, objeto) cuenta como vacío.
function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// AAAA-MM-DD que exista en el calendario (rechaza 2026-02-30).
function isRealDate(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return false;
  }
  const parsed = new Date(`${date}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
}

export function validateBookingPayload(payload: CreateAppointmentPayload, todayLima: string): ValidationResult {
  const value: ValidBooking = {
    dni: text(payload.dni),
    firstName: text(payload.firstName),
    lastName: text(payload.lastName),
    email: text(payload.email),
    phone: text(payload.phone),
    professionalId: text(payload.professionalId),
    branchId: text(payload.branchId),
    serviceId: text(payload.serviceId),
    date: text(payload.date),
    startTime: text(payload.startTime),
    reason: text(payload.reason) || null,
  };

  const required = [
    value.dni,
    value.firstName,
    value.lastName,
    value.email,
    value.phone,
    value.professionalId,
    value.branchId,
    value.serviceId,
    value.date,
    value.startTime,
  ];
  if (required.some((field) => !field)) {
    return { ok: false, error: 'Faltan datos obligatorios para reservar la cita.' };
  }
  if (!/^\d{8}$/.test(value.dni)) {
    return { ok: false, error: 'El DNI debe tener 8 dígitos.' };
  }
  if (value.firstName.length < 2 || value.lastName.length < 2) {
    return { ok: false, error: 'Los nombres y apellidos deben tener al menos 2 caracteres.' };
  }
  if (!EMAIL_PATTERN.test(value.email)) {
    return { ok: false, error: 'El correo no tiene un formato válido.' };
  }
  if (!/^\d{9}$/.test(value.phone)) {
    return { ok: false, error: 'El teléfono debe tener 9 dígitos.' };
  }
  if (![value.professionalId, value.branchId, value.serviceId].every((id) => UUID_PATTERN.test(id))) {
    return { ok: false, error: 'La sede, profesional o servicio elegido no es válido.' };
  }
  if (!isRealDate(value.date) || !/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(value.startTime)) {
    return { ok: false, error: 'La fecha u hora de la cita no es válida.' };
  }
  if (value.date < todayLima) {
    return { ok: false, error: 'No se puede reservar una fecha pasada.' };
  }

  return { ok: true, value };
}

const limaDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Lima',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

// Supabase corre en UTC: desde las 19:00 de Lima la fecha UTC ya es mañana.
export function limaToday(now: Date = new Date()): string {
  return limaDateFormatter.format(now);
}

const limaTimeFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'America/Lima',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

// Fecha y hora (HH:MM) actuales en Lima.
export function limaNow(now: Date = new Date()): { date: string; time: string } {
  return { date: limaDateFormatter.format(now), time: limaTimeFormatter.format(now) };
}

export function addMinutes(time: string, minutes: number): string {
  const [hours, mins] = time.split(':').map(Number);
  const total = hours * 60 + mins + minutes;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

export interface PatientRow {
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
}

// Un DNI ya registrado conserva sus datos: quien solo conoce un DNI no puede
// cambiar el nombre, correo o teléfono de otra persona. Solo se completan
// los campos vacíos, salvo el correo: a él llegan los códigos de todas las
// citas (resend-code), así que nunca se registra desde una reserva pública.
// Si falta, lo registra la clínica.
export function missingPatientFields(
  existing: PatientRow,
  incoming: Pick<ValidBooking, 'firstName' | 'lastName' | 'email' | 'phone'>,
): Partial<PatientRow> {
  const patch: Partial<PatientRow> = {};
  const isEmpty = (value: string | null) => !value?.trim();
  if (isEmpty(existing.first_name)) patch.first_name = incoming.firstName;
  if (isEmpty(existing.last_name)) patch.last_name = incoming.lastName;
  if (isEmpty(existing.phone)) patch.phone = incoming.phone;
  return patch;
}

// Mayúsculas, tildes y espacios no cuentan como "datos distintos".
function normalizeForMatch(value: string | null): string {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

// ¿La reserva trae los mismos nombres, apellidos y correo que el paciente
// registrado? Si no, quien reserva quizá solo conoce el DNI: el código de su
// cita solo le dará acceso a esa cita (appointments.code_limited).
export function bookingMatchesPatient(
  existing: PatientRow,
  incoming: Pick<ValidBooking, 'firstName' | 'lastName' | 'email'>,
): boolean {
  const registeredEmail = normalizeForMatch(existing.email);
  return (
    registeredEmail !== '' &&
    registeredEmail === normalizeForMatch(incoming.email) &&
    normalizeForMatch(existing.first_name) === normalizeForMatch(incoming.firstName) &&
    normalizeForMatch(existing.last_name) === normalizeForMatch(incoming.lastName)
  );
}

interface DbError {
  code?: string;
  message?: string;
  details?: string | null;
}

// 23P01 = exclusion_violation. El nombre de la restricción dice cuál choque fue.
export function overlapErrorMessage(error: DbError): string | null {
  if (error.code !== '23P01') {
    return null;
  }
  const text = `${error.message ?? ''} ${error.details ?? ''}`;
  if (text.includes('appointments_no_patient_overlap')) {
    return 'Ya tienes una cita que se cruza con ese horario.';
  }
  return 'Ese horario ya no está disponible. Elige otro.';
}

export const SERVICE_NOT_OFFERED = 'Este servicio no se brinda en esta sede.';

// Respuesta de la RPC is_bookable_service: el servicio es de esa sede, es
// reservable y esa profesional lo atiende. Cualquier otra cosa se rechaza.
export function serviceOfferError(isBookable: unknown): string | null {
  return isBookable === true ? null : SERVICE_NOT_OFFERED;
}

// Regla del paciente (no del personal): el mismo día no puede tener citas en
// dos sedes distintas. En la misma sede sí, mientras no se crucen (eso lo
// impide appointments_no_patient_overlap). Las canceladas no cuentan.
export const OTHER_BRANCH_SAME_DAY =
  'Ya tienes una cita ese día en otra sede. Elige otro día o reserva en la misma sede.';

export function otherBranchSameDayError(
  sameDayAppointments: { branch_id: string; status: string }[],
  branchId: string,
): string | null {
  const conflict = sameDayAppointments.some(
    (appointment) => appointment.status !== 'cancelled' && appointment.branch_id !== branchId,
  );
  return conflict ? OTHER_BRANCH_SAME_DAY : null;
}

const STAFF_ROLES = ['admin_global', 'admin_sede', 'especialista', 'odontologa_general', 'tecnica'];

// Quien reserva con sesión de personal (p. ej. "Nueva cita" del panel).
export function isStaffRole(role: string | null | undefined): boolean {
  return role !== null && role !== undefined && STAFF_ROLES.includes(role);
}
