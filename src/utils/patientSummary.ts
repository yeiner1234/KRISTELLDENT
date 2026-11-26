import type { Appointment, AppointmentStatus } from '../types/Appointment';
import type { Patient } from '../types/Patient';
import type { Professional } from '../types/Professional';
import type { Service } from '../types/Service';
import { formatFullName } from './format';

// Ficha resumida de un paciente para el panel de la técnica: todo sale de sus
// citas (todavía no hay tabla de tratamientos).

export type PatientAlert = 'new' | 'cancellations' | 'inactive' | 'unconfirmed';
export type PatientFilter = 'all' | 'today' | 'unconfirmed' | 'inactive' | 'new';
export type PatientSort = 'next' | 'lastVisit' | 'name';

export interface PatientAppointmentView {
  appointment: Appointment;
  professionalName: string;
  serviceName: string;
}

export interface ServiceReceived {
  name: string;
  count: number;
  lastDate: string;
}

export interface PatientSummary {
  patient: Patient;
  fullName: string;
  today: PatientAppointmentView | null;
  next: PatientAppointmentView | null;
  lastVisit: PatientAppointmentView | null;
  daysSinceLastVisit: number | null;
  counts: { completed: number; cancelled: number; upcoming: number; total: number };
  reason: string;
  servicesReceived: ServiceReceived[];
  usualProfessionalName: string | null;
  usualBranchId: string | null;
  alerts: PatientAlert[];
  // De la más reciente a la más antigua.
  history: PatientAppointmentView[];
}

interface SummaryLookups {
  professionals: Professional[];
  services: Service[];
}

const ACTIVE_STATUSES: AppointmentStatus[] = ['pending', 'confirmed', 'in_room'];
// Más de 6 meses sin venir.
const INACTIVE_AFTER_DAYS = 180;
const MANY_CANCELLATIONS = 2;

function parseIsoDateUtc(isoDate: string): number {
  const [year, month, day] = isoDate.split('-').map(Number);
  return Date.UTC(year, month - 1, day);
}

export function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((parseIsoDateUtc(toIso) - parseIsoDateUtc(fromIso)) / 86_400_000);
}

const WEEKDAYS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'set', 'oct', 'nov', 'dic'];

// "Hoy", "Mañana", "Ayer" o "vie 27 nov" (con año si no es el de hoy).
export function formatRelativeDay(isoDate: string, todayIso: string): string {
  const diff = daysBetween(todayIso, isoDate);
  if (diff === 0) return 'Hoy';
  if (diff === 1) return 'Mañana';
  if (diff === -1) return 'Ayer';
  const date = new Date(parseIsoDateUtc(isoDate));
  const label = `${WEEKDAYS[date.getUTCDay()]} ${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]}`;
  return isoDate.slice(0, 4) === todayIso.slice(0, 4) ? label : `${label} ${isoDate.slice(0, 4)}`;
}

// "hoy", "hace 1 día", "hace 3 meses"...
export function formatDaysAgo(days: number): string {
  if (days <= 0) return 'hoy';
  if (days === 1) return 'hace 1 día';
  if (days < 45) return `hace ${days} días`;
  const months = Math.round(days / 30);
  if (months < 12) return `hace ${months} meses`;
  const years = Math.floor(days / 365);
  return years === 1 ? 'hace más de 1 año' : `hace más de ${years} años`;
}

function chronological(a: Appointment, b: Appointment): number {
  return a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime);
}

function mostFrequent(values: string[]): string | null {
  const counts = new Map<string, number>();
  let best: string | null = null;
  for (const value of values) {
    const count = (counts.get(value) ?? 0) + 1;
    counts.set(value, count);
    if (best === null || count > (counts.get(best) ?? 0)) best = value;
  }
  return best;
}

export function buildPatientSummaries(
  patients: Patient[],
  appointments: Appointment[],
  lookups: SummaryLookups,
  todayIso: string,
): PatientSummary[] {
  const professionalById = new Map(lookups.professionals.map((professional) => [professional.id, professional]));
  const serviceById = new Map(lookups.services.map((service) => [service.id, service]));
  const appointmentsByPatient = new Map<string, Appointment[]>();
  for (const appointment of appointments) {
    const list = appointmentsByPatient.get(appointment.patientId) ?? [];
    list.push(appointment);
    appointmentsByPatient.set(appointment.patientId, list);
  }

  const toView = (appointment: Appointment): PatientAppointmentView => ({
    appointment,
    professionalName: professionalById.get(appointment.professionalId)?.fullName || '—',
    // La copia guardada en la cita manda, como en buildAppointmentViews.
    serviceName:
      appointment.serviceName ??
      (appointment.serviceId ? serviceById.get(appointment.serviceId)?.name : undefined) ??
      'Sin servicio',
  });

  return patients.map((patient) => {
    const own = [...(appointmentsByPatient.get(patient.id) ?? [])].sort(chronological);
    const history = [...own].reverse().map(toView);
    const completed = own.filter((appointment) => appointment.status === 'completed');
    const cancelled = own.filter((appointment) => appointment.status === 'cancelled');
    const upcoming = own.filter(
      (appointment) => ACTIVE_STATUSES.includes(appointment.status) && appointment.date >= todayIso,
    );

    const todayAppointment = own.find(
      (appointment) => appointment.date === todayIso && appointment.status !== 'cancelled',
    );
    const next = upcoming[0] ? toView(upcoming[0]) : null;
    const lastCompleted = completed.at(-1);
    const lastVisit = lastCompleted ? toView(lastCompleted) : null;
    const daysSinceLastVisit = lastCompleted ? daysBetween(lastCompleted.date, todayIso) : null;

    const servicesByName = new Map<string, ServiceReceived>();
    for (const view of completed.map(toView)) {
      const current = servicesByName.get(view.serviceName);
      servicesByName.set(view.serviceName, {
        name: view.serviceName,
        count: (current?.count ?? 0) + 1,
        lastDate: view.appointment.date,
      });
    }
    const servicesReceived = [...servicesByName.values()].sort(
      (a, b) => b.count - a.count || b.lastDate.localeCompare(a.lastDate),
    );

    // Lo más reciente gana los empates.
    const attended = [...own].reverse().filter((appointment) => appointment.status !== 'cancelled');
    const usualProfessionalId = mostFrequent(attended.map((appointment) => appointment.professionalId));
    const usualBranchId = mostFrequent(attended.map((appointment) => appointment.branchId));

    const reason =
      upcoming[0]?.reason.trim() ||
      [...own].reverse().find((appointment) => appointment.reason.trim())?.reason.trim() ||
      '';

    const alerts: PatientAlert[] = [];
    if (next?.appointment.status === 'pending') alerts.push('unconfirmed');
    if (completed.length === 0) alerts.push('new');
    if (cancelled.length >= MANY_CANCELLATIONS) alerts.push('cancellations');
    if (!next && daysSinceLastVisit !== null && daysSinceLastVisit > INACTIVE_AFTER_DAYS) alerts.push('inactive');

    return {
      patient,
      fullName: formatFullName(patient.firstName, patient.lastName),
      today: todayAppointment ? toView(todayAppointment) : null,
      next,
      lastVisit,
      daysSinceLastVisit,
      counts: {
        completed: completed.length,
        cancelled: cancelled.length,
        upcoming: upcoming.length,
        total: own.length,
      },
      reason,
      servicesReceived,
      usualProfessionalName: usualProfessionalId
        ? professionalById.get(usualProfessionalId)?.fullName || null
        : null,
      usualBranchId,
      alerts,
      history,
    };
  });
}

function matchesFilter(summary: PatientSummary, filter: PatientFilter): boolean {
  switch (filter) {
    case 'all':
      return true;
    case 'today':
      return summary.today !== null;
    default:
      return summary.alerts.includes(filter);
  }
}

export function filterPatientSummaries(
  summaries: PatientSummary[],
  filter: PatientFilter,
  query: string,
): PatientSummary[] {
  const term = query.trim().toLowerCase();
  return summaries.filter(
    (summary) =>
      matchesFilter(summary, filter) &&
      (!term || `${summary.fullName} ${summary.patient.dni}`.toLowerCase().includes(term)),
  );
}

export function countPatientFilters(summaries: PatientSummary[]): Record<PatientFilter, number> {
  const filters: PatientFilter[] = ['all', 'today', 'unconfirmed', 'inactive', 'new'];
  return Object.fromEntries(
    filters.map((filter) => [filter, summaries.filter((summary) => matchesFilter(summary, filter)).length]),
  ) as Record<PatientFilter, number>;
}

export function sortPatientSummaries(summaries: PatientSummary[], sort: PatientSort): PatientSummary[] {
  const byName = (a: PatientSummary, b: PatientSummary) => a.fullName.localeCompare(b.fullName, 'es');
  const sorted = [...summaries];

  if (sort === 'name') return sorted.sort(byName);
  if (sort === 'lastVisit') {
    return sorted.sort((a, b) => {
      const aDate = a.lastVisit?.appointment.date ?? '';
      const bDate = b.lastVisit?.appointment.date ?? '';
      return bDate.localeCompare(aDate) || byName(a, b);
    });
  }
  return sorted.sort((a, b) => {
    if (a.next && b.next) return chronological(a.next.appointment, b.next.appointment) || byName(a, b);
    if (a.next) return -1;
    if (b.next) return 1;
    return byName(a, b);
  });
}
