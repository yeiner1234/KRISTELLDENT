import type { Appointment, AppointmentStatus } from '../../types/Appointment';
import type { Patient } from '../../types/Patient';
import type { Professional } from '../../types/Professional';
import type { Service } from '../../types/Service';
import type { AppRole } from '../../types/User';
import type { WeekdayKey, WeeklyHours } from '../businessHours';

// Lógica del reporte "Agenda de citas de la sede" (nivel operativo). Todo es
// puro: la página solo junta los datos y pinta lo que sale de aquí.

export type AgendaStatusFilter = 'pending_confirmed' | 'all' | AppointmentStatus;
export type AgendaShift = 'all' | 'morning' | 'afternoon';

export const AGENDA_STATUS_OPTIONS: { value: AgendaStatusFilter; label: string }[] = [
  { value: 'pending_confirmed', label: 'Pendiente y confirmada' },
  { value: 'all', label: 'Todas' },
  { value: 'pending', label: 'Pendiente' },
  { value: 'confirmed', label: 'Confirmada' },
  { value: 'in_room', label: 'En sala' },
  { value: 'completed', label: 'Atendida' },
  { value: 'cancelled', label: 'Cancelada' },
];

export const AGENDA_SHIFT_OPTIONS: { value: AgendaShift; label: string }[] = [
  { value: 'all', label: 'Mañana y tarde' },
  { value: 'morning', label: 'Mañana' },
  { value: 'afternoon', label: 'Tarde' },
];

export const AGENDA_STATUS_LABELS: Record<AppointmentStatus, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmada',
  in_room: 'En sala',
  completed: 'Atendida',
  cancelled: 'Cancelada',
};

// La tarde empieza a las 13:00.
const AFTERNOON_START = '13:00';

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'set', 'oct', 'nov', 'dic'];
const WEEKDAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const WEEKDAY_KEYS: WeekdayKey[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

function stripAccents(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

// Día de la semana de una fecha AAAA-MM-DD sin depender de la zona del navegador.
function weekdayIndex(isoDate: string): number {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

// AGE-<SED>-<año>-<MMDD>, ej. AGE-BAG-2026-1015.
export function buildDocumentCode(branchName: string, isoDate: string): string {
  const letters = stripAccents(branchName.replace(/^sede\s+/i, ''))
    .replace(/[^a-zA-Z]/g, '')
    .slice(0, 3)
    .toUpperCase();
  const [year, month, day] = isoDate.split('-');
  return `AGE-${letters}-${year}-${month}${day}`;
}

// "Jueves 15 oct 2026", con los meses abreviados de Perú (set, no sep).
export function formatAgendaDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  return `${WEEKDAYS[weekdayIndex(isoDate)]} ${day} ${MONTHS[month - 1]} ${year}`;
}

const limaPartsFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'America/Lima',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

// dd/mm/aaaa · HH:MM en hora de Lima.
export function formatGeneratedAt(now: Date): string {
  const parts = Object.fromEntries(limaPartsFormatter.formatToParts(now).map((part) => [part.type, part.value]));
  return `${parts.day}/${parts.month}/${parts.year} · ${parts.hour}:${parts.minute}`;
}

// El nombre completo viene como "Nombres Apellido1 Apellido2": con tres o más
// palabras los dos últimos son los apellidos; con dos, el último.
function splitFullName(fullName: string): { firstNames: string[]; surnames: string[] } {
  const words = fullName.trim().split(/\s+/).filter(Boolean);
  if (words.length <= 1) return { firstNames: words, surnames: [] };
  const surnameCount = words.length >= 3 ? 2 : 1;
  return { firstNames: words.slice(0, -surnameCount), surnames: words.slice(-surnameCount) };
}

export function firstSurname(fullName: string): string {
  const { firstNames, surnames } = splitFullName(fullName);
  return surnames[0] ?? firstNames[0] ?? '';
}

export function doctorInitials(fullName: string): string {
  const { firstNames, surnames } = splitFullName(fullName);
  return `${firstNames[0]?.[0] ?? ''}${surnames[0]?.[0] ?? ''}`.toUpperCase();
}

// "Dra. L. Mendoza Paz".
export function formatDoctorName(fullName: string): string {
  const { firstNames, surnames } = splitFullName(fullName);
  if (!firstNames[0]) return 'Dra.';
  if (surnames.length === 0) return `Dra. ${firstNames[0]}`;
  return `Dra. ${firstNames[0][0].toUpperCase()}. ${surnames.join(' ')}`;
}

// Paleta suave de las iniciales: verde azulado, rosado y gris claros.
export const DOCTOR_COLORS = [
  { bg: '#D9F0F2', text: '#00707D' },
  { bg: '#FBE1EB', text: '#A3124D' },
  { bg: '#E6EAED', text: '#3E4C55' },
];

// Color fijo por doctora: se reparte por orden de apellidos entre las doctoras
// de la sede, así no cambia según la hora de sus citas.
export function assignDoctorColors(professionals: Pick<Professional, 'id' | 'fullName'>[]): Map<string, number> {
  const sorted = [...professionals].sort((a, b) => surnameFirst(a.fullName).localeCompare(surnameFirst(b.fullName), 'es'));
  return new Map(sorted.map((professional, index) => [professional.id, index % DOCTOR_COLORS.length]));
}

// "Mendoza Paz Lucía": para ordenar por apellidos.
function surnameFirst(fullName: string): string {
  const { firstNames, surnames } = splitFullName(fullName);
  return [...surnames, ...firstNames].join(' ');
}

export function formatPatientName(firstName: string, lastName: string): string {
  return [lastName.trim(), firstName.trim()].filter(Boolean).join(', ');
}

export function matchesShift(startTime: string, shift: AgendaShift): boolean {
  if (shift === 'morning') return startTime < AFTERNOON_START;
  if (shift === 'afternoon') return startTime >= AFTERNOON_START;
  return true;
}

export function matchesStatusFilter(status: AppointmentStatus, filter: AgendaStatusFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'pending_confirmed') return status === 'pending' || status === 'confirmed';
  return status === filter;
}

export interface AgendaFilters {
  branchId: string;
  date: string;
  // '' = todas las doctoras.
  professionalId: string;
  status: AgendaStatusFilter;
  shift: AgendaShift;
}

interface AgendaLookups {
  patients: Patient[];
  professionals: Professional[];
  services: Service[];
}

export interface AgendaRow {
  id: string;
  time: string;
  patientName: string;
  serviceName: string;
  professionalId: string;
  doctorFullName: string;
  doctorName: string;
  doctorInitials: string;
  status: AppointmentStatus;
}

// Citas del día y la sede (sin aplicar doctora, estado ni turno): sirve para
// contar las doctoras con citas ese día en "Todas (N)".
export function appointmentsOfDay(appointments: Appointment[], branchId: string, date: string): Appointment[] {
  return appointments.filter((appointment) => appointment.branchId === branchId && appointment.date === date);
}

export function buildAgendaRows(appointments: Appointment[], lookups: AgendaLookups, filters: AgendaFilters): AgendaRow[] {
  const patientById = new Map(lookups.patients.map((patient) => [patient.id, patient]));
  const professionalById = new Map(lookups.professionals.map((professional) => [professional.id, professional]));
  const serviceById = new Map(lookups.services.map((service) => [service.id, service]));

  return appointmentsOfDay(appointments, filters.branchId, filters.date)
    .filter(
      (appointment) =>
        (!filters.professionalId || appointment.professionalId === filters.professionalId) &&
        matchesStatusFilter(appointment.status, filters.status) &&
        matchesShift(appointment.startTime, filters.shift),
    )
    .map((appointment) => {
      const patient = patientById.get(appointment.patientId);
      const doctorFullName = professionalById.get(appointment.professionalId)?.fullName ?? '';
      return {
        id: appointment.id,
        time: appointment.startTime,
        patientName: patient ? formatPatientName(patient.firstName, patient.lastName) : 'Paciente',
        // La copia guardada en la cita manda (historial).
        serviceName:
          appointment.serviceName || (appointment.serviceId && serviceById.get(appointment.serviceId)?.name) || '—',
        professionalId: appointment.professionalId,
        doctorFullName,
        doctorName: doctorFullName ? formatDoctorName(doctorFullName) : '—',
        doctorInitials: doctorFullName ? doctorInitials(doctorFullName) : '—',
        status: appointment.status,
      };
    })
    // La doctora se ordena por apellidos, no por la inicial del nombre.
    .sort(
      (a, b) =>
        a.time.localeCompare(b.time) || surnameFirst(a.doctorFullName).localeCompare(surnameFirst(b.doctorFullName), 'es'),
    );
}

export interface AgendaSummary {
  total: number;
  confirmed: number;
  pending: number;
  doctorCount: number;
  doctorSurnames: string;
}

export function summarizeAgenda(rows: AgendaRow[]): AgendaSummary {
  const doctors = new Map<string, string>();
  for (const row of rows) {
    doctors.set(row.professionalId, firstSurname(row.doctorFullName));
  }
  const surnames = [...doctors.values()].filter(Boolean).sort((a, b) => a.localeCompare(b, 'es'));

  return {
    total: rows.length,
    confirmed: rows.filter((row) => row.status === 'confirmed').length,
    pending: rows.filter((row) => row.status === 'pending').length,
    doctorCount: doctors.size,
    doctorSurnames: surnames.join(' · '),
  };
}

const ROLE_LABELS: Partial<Record<AppRole, string>> = {
  tecnica: 'Técnica',
  admin_sede: 'Administradora de sede',
  admin_global: 'Administradora general',
};

export function reportRoleLabel(role: AppRole): string {
  return ROLE_LABELS[role] ?? role;
}

// "Sede Bagua · 08:00 – 18:00" con el horario de ese día de la semana.
export function branchHoursLabel(branchName: string, hours: WeeklyHours, isoDate: string): string {
  const day = hours[WEEKDAY_KEYS[weekdayIndex(isoDate)]];
  return day ? `Sede ${branchName} · ${day.open} – ${day.close}` : 'Sede cerrada';
}

// Tamaños de la hoja en pantalla (controles − / + del celular). Al imprimir
// siempre sale a tamaño real.
export const SHEET_ZOOM_STEPS = [0.4, 0.5, 0.6, 0.75, 0.9, 1, 1.25, 1.5];

// Siguiente paso hacia arriba (1) o hacia abajo (-1), sin salir de los límites.
export function zoomSheet(current: number, direction: 1 | -1): number {
  const steps = direction === 1 ? SHEET_ZOOM_STEPS : [...SHEET_ZOOM_STEPS].reverse();
  const next = steps.find((step) => (direction === 1 ? step > current + 0.001 : step < current - 0.001));
  return next ?? steps[steps.length - 1];
}

// "Ajustar": la hoja (contentWidth px) al ancho disponible (containerWidth px),
// sin agrandarla nunca más allá de su tamaño real.
export function sheetFitScale(containerWidth: number, contentWidth: number): number {
  if (containerWidth <= 0 || contentWidth <= 0) {
    return 1;
  }
  return Math.min(1, containerWidth / contentWidth);
}
