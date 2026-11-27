import type { Appointment, AppointmentStatus } from '../../types/Appointment';
import type { Service } from '../../types/Service';
import type { Specialty } from '../../types/Specialty';

// Base común de los reportes de administración (citas, pacientes, desempeño e
// ingresos): cada cita con su especialidad, duración, precio, doctora y sede.
// Todo es puro; la RLS ya limita las citas a las sedes de quien consulta.

export interface ReportAppointment extends Appointment {
  specialtyId: string | null;
  specialtyName: string;
  serviceLabel: string;
  durationMinutes: number;
  // Precio guardado en la cita al reservar; si no hay, el vigente del servicio.
  price: number;
  // Precio vigente del servicio hoy (columna "Precio vigente"); null sin servicio.
  listPrice: number | null;
  doctorName: string;
  branchName: string;
}

export interface ReportLookups {
  services: Service[];
  specialties: Specialty[];
  professionals: { id: string; fullName: string }[];
  branches: { id: string; name: string }[];
}

export const NO_SPECIALTY = 'Sin especialidad';

function minutesBetween(start: string, end: string): number {
  const [startHours, startMinutes] = start.split(':').map(Number);
  const [endHours, endMinutes] = end.split(':').map(Number);
  return Math.max(0, endHours * 60 + endMinutes - (startHours * 60 + startMinutes));
}

export function enrichAppointments(appointments: Appointment[], lookups: ReportLookups): ReportAppointment[] {
  const serviceById = new Map(lookups.services.map((service) => [service.id, service]));
  const specialtyById = new Map(lookups.specialties.map((specialty) => [specialty.id, specialty]));
  const doctorById = new Map(lookups.professionals.map((professional) => [professional.id, professional.fullName]));
  const branchById = new Map(lookups.branches.map((branch) => [branch.id, branch.name]));

  return appointments.map((appointment) => {
    const service = appointment.serviceId ? serviceById.get(appointment.serviceId) : undefined;
    const specialty = service ? specialtyById.get(service.specialtyId) : undefined;
    return {
      ...appointment,
      specialtyId: specialty?.id ?? null,
      specialtyName: specialty?.name ?? NO_SPECIALTY,
      serviceLabel: appointment.serviceName || service?.name || '—',
      durationMinutes:
        appointment.serviceDuration ?? service?.duration ?? minutesBetween(appointment.startTime, appointment.endTime),
      price: appointment.servicePrice ?? service?.price ?? 0,
      listPrice: service?.price ?? null,
      doctorName: doctorById.get(appointment.professionalId) ?? '—',
      branchName: branchById.get(appointment.branchId) ?? '—',
    };
  });
}

export type ReportStatusFilter = 'all' | AppointmentStatus;

export const REPORT_STATUS_OPTIONS: { value: ReportStatusFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'completed', label: 'Atendida' },
  { value: 'cancelled', label: 'Cancelada' },
  { value: 'pending', label: 'Pendiente' },
  { value: 'confirmed', label: 'Confirmada' },
  { value: 'in_room', label: 'En sala' },
];

export interface ReportFilters {
  from: string;
  to: string;
  // '' = todas (las que la persona puede ver).
  branchId: string;
  professionalId: string;
  specialtyId: string;
  status: ReportStatusFilter;
}

// Sede, doctora y especialidad, sin periodo ni estado.
export function matchesScope(row: ReportAppointment, filters: Pick<ReportFilters, 'branchId' | 'professionalId' | 'specialtyId'>): boolean {
  return (
    (!filters.branchId || row.branchId === filters.branchId) &&
    (!filters.professionalId || row.professionalId === filters.professionalId) &&
    (!filters.specialtyId || row.specialtyId === filters.specialtyId)
  );
}

export function filterReportAppointments(rows: ReportAppointment[], filters: ReportFilters): ReportAppointment[] {
  return rows.filter(
    (row) =>
      row.date >= filters.from &&
      row.date <= filters.to &&
      matchesScope(row, filters) &&
      (filters.status === 'all' || row.status === filters.status),
  );
}

const OPEN_STATUSES: AppointmentStatus[] = ['pending', 'confirmed', 'in_room'];

export function isUnclosedAppointment(row: Pick<Appointment, 'date' | 'status'>, today: string): boolean {
  return row.date < today && OPEN_STATUSES.includes(row.status);
}

const limaDate = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Lima',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export function createdDateInLima(createdAt: string): string {
  return limaDate.format(new Date(createdAt));
}

// En %; sin base, null.
export function rate(part: number, total: number): number | null {
  return total === 0 ? null : (part / total) * 100;
}

// El papel lleva DNI y teléfono enmascarados (catálogo de reportes).
export function maskDni(dni: string): string {
  return dni.length > 4 ? `${dni.slice(0, 4)}${'•'.repeat(dni.length - 4)}` : dni;
}

export function maskPhone(phone: string | null | undefined): string {
  const digits = (phone ?? '').replace(/\D/g, '');
  if (digits.length < 6) return phone ? '•••' : '—';
  return `${digits.slice(0, 3)} ••• ${digits.slice(-3)}`;
}

const integerFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const decimalFormatter = new Intl.NumberFormat('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export function formatInteger(value: number): string {
  return integerFormatter.format(Math.round(value));
}

export function formatDecimal(value: number): string {
  return decimalFormatter.format(value);
}

export function formatMoney(value: number): string {
  return `S/ ${formatInteger(value)}`;
}

// "76.2 mil" para ejes y barras.
export function formatMoneyShort(value: number): string {
  if (value < 1000) return formatInteger(value);
  const thousands = Math.round(value / 100) / 10;
  return `${Number.isInteger(thousands) ? thousands : thousands.toFixed(1)} mil`;
}

export function formatRate(value: number | null): string {
  return value === null ? '—' : `${value.toFixed(1)} %`;
}
