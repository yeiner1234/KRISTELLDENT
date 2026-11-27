import type { Appointment, AppointmentStatus } from '../../types/Appointment';
import type { Patient } from '../../types/Patient';
import { formatPatientName } from './agenda';
import { addDaysToIsoDate } from '../date';
import { bucketOf, daysBetween, type PeriodBucket } from './period';

// Lógica del reporte "Mis citas" (nivel especialista). Recibe solo las citas de
// la profesional con sesión (la RLS ya lo asegura); todo es puro.

export type MyAppointmentsStatusFilter = 'all' | AppointmentStatus;

export const MY_APPOINTMENTS_STATUS_OPTIONS: { value: MyAppointmentsStatusFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'completed', label: 'Atendida' },
  { value: 'cancelled', label: 'Cancelada' },
  { value: 'pending', label: 'Pendiente' },
  { value: 'confirmed', label: 'Confirmada' },
  { value: 'in_room', label: 'En sala' },
];

export interface MyAppointmentsFilters {
  from: string;
  to: string;
  // '' = todas las sedes / todos los servicios.
  branchId: string;
  serviceName: string;
  status: MyAppointmentsStatusFilter;
}

const OPEN_STATUSES: AppointmentStatus[] = ['pending', 'confirmed', 'in_room'];

export function appointmentServiceName(appointment: Appointment): string {
  return appointment.serviceName || '—';
}

// Sede y servicio (sin periodo ni estado): sirve también para las próximas citas.
export function matchesBranchAndService(
  appointment: Appointment,
  filters: Pick<MyAppointmentsFilters, 'branchId' | 'serviceName'>,
): boolean {
  return (
    (!filters.branchId || appointment.branchId === filters.branchId) &&
    (!filters.serviceName || appointmentServiceName(appointment) === filters.serviceName)
  );
}

export function filterMyAppointments(appointments: Appointment[], filters: MyAppointmentsFilters): Appointment[] {
  return appointments.filter(
    (appointment) =>
      appointment.date >= filters.from &&
      appointment.date <= filters.to &&
      matchesBranchAndService(appointment, filters) &&
      (filters.status === 'all' || appointment.status === filters.status),
  );
}

// En %; sin atendidas ni canceladas no hay tasa.
export function attendanceRate(completed: number, cancelled: number): number | null {
  const closed = completed + cancelled;
  return closed === 0 ? null : (completed / closed) * 100;
}

export interface MyAppointmentsSummary {
  total: number;
  completed: number;
  cancelled: number;
  rate: number | null;
  // Pasadas (antes de hoy) que siguen pendientes, confirmadas o en sala.
  unclosed: number;
}

function isUnclosed(appointment: Appointment, today: string): boolean {
  return appointment.date < today && OPEN_STATUSES.includes(appointment.status);
}

export function summarizeMyAppointments(appointments: Appointment[], today: string): MyAppointmentsSummary {
  const completed = appointments.filter((appointment) => appointment.status === 'completed').length;
  const cancelled = appointments.filter((appointment) => appointment.status === 'cancelled').length;
  return {
    total: appointments.length,
    completed,
    cancelled,
    rate: attendanceRate(completed, cancelled),
    unclosed: appointments.filter((appointment) => isUnclosed(appointment, today)).length,
  };
}

export interface AttendancePoint {
  key: string;
  label: string;
  completed: number;
  cancelled: number;
}

export function buildAttendanceSeries(appointments: Appointment[], buckets: PeriodBucket[]): AttendancePoint[] {
  const points = buckets.map((bucket) => ({ key: bucket.key, label: bucket.label, completed: 0, cancelled: 0 }));
  const byKey = new Map(points.map((point) => [point.key, point]));
  for (const appointment of appointments) {
    if (appointment.status !== 'completed' && appointment.status !== 'cancelled') continue;
    const bucket = bucketOf(buckets, appointment.date);
    const point = bucket && byKey.get(bucket.key);
    if (point) point[appointment.status] += 1;
  }
  return points;
}

function patientNameOf(patientById: Map<string, Patient>, patientId: string): string {
  const patient = patientById.get(patientId);
  return patient ? formatPatientName(patient.firstName, patient.lastName) : 'Paciente';
}

export interface UnclosedRow {
  id: string;
  date: string;
  time: string;
  patientName: string;
  status: AppointmentStatus;
  delayDays: number;
}

export function buildUnclosedRows(appointments: Appointment[], patients: Patient[], today: string): UnclosedRow[] {
  const patientById = new Map(patients.map((patient) => [patient.id, patient]));
  return appointments
    .filter((appointment) => isUnclosed(appointment, today))
    .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime))
    .map((appointment) => ({
      id: appointment.id,
      date: appointment.date,
      time: appointment.startTime,
      patientName: patientNameOf(patientById, appointment.patientId),
      status: appointment.status,
      delayDays: daysBetween(appointment.date, today),
    }));
}

export interface UpcomingRow {
  id: string;
  date: string;
  time: string;
  patientName: string;
  serviceName: string;
  reason: string;
  status: AppointmentStatus;
}

export interface UpcomingResult {
  rows: UpcomingRow[];
  // Programadas desde ahora (todas) y en los próximos 30 días.
  total: number;
  within30Days: number;
}

// Pendientes o confirmadas desde la hora actual de Lima; muestra las primeras `limit`.
export function buildUpcomingRows(
  appointments: Appointment[],
  patients: Patient[],
  today: string,
  nowTime: string,
  limit: number,
): UpcomingResult {
  const patientById = new Map(patients.map((patient) => [patient.id, patient]));
  const limit30 = addDaysToIsoDate(today, 30);
  const upcoming = appointments
    .filter(
      (appointment) =>
        (appointment.status === 'pending' || appointment.status === 'confirmed') &&
        (appointment.date > today || (appointment.date === today && appointment.startTime >= nowTime)),
    )
    .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));

  return {
    total: upcoming.length,
    within30Days: upcoming.filter((appointment) => appointment.date <= limit30).length,
    rows: upcoming.slice(0, limit).map((appointment) => ({
      id: appointment.id,
      date: appointment.date,
      time: appointment.startTime,
      patientName: patientNameOf(patientById, appointment.patientId),
      serviceName: appointmentServiceName(appointment),
      reason: appointment.reason || '—',
      status: appointment.status,
    })),
  };
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)} %`;
}

// Frases de "Lectura del periodo".
export function myAppointmentsReadings(input: {
  rate: number | null;
  branchRate: number | null;
  series: AttendancePoint[];
  unclosed: number;
}): string[] {
  const readings: string[] = [];

  if (input.rate === null) {
    readings.push('No hay citas atendidas ni canceladas en el periodo.');
  } else if (input.branchRate === null) {
    readings.push(`Su tasa de atención es ${formatPercent(input.rate)}.`);
  } else {
    const rate = Math.round(input.rate * 10) / 10;
    const branch = Math.round(input.branchRate * 10) / 10;
    const verb = rate > branch ? 'supera' : rate < branch ? 'está por debajo de' : 'es igual a';
    readings.push(`Su tasa de atención (${formatPercent(rate)}) ${verb} el promedio de la sede (${formatPercent(branch)}).`);
  }

  if (input.series.length >= 2) {
    const first = input.series[0];
    const last = input.series[input.series.length - 1];
    const trend =
      last.completed > first.completed ? 'crecieron' : last.completed < first.completed ? 'bajaron' : 'se mantuvieron';
    readings.push(
      `Las atenciones ${trend} de ${first.completed} en ${first.label.toLowerCase()} a ${last.completed} en ${last.label.toLowerCase()}.`,
    );
  }

  readings.push(
    input.unclosed === 0
      ? 'Todas sus citas pasadas tienen estado final.'
      : `Tiene ${input.unclosed} ${input.unclosed === 1 ? 'cita pasada' : 'citas pasadas'} sin estado final; actualícelas para que el reporte sea exacto.`,
  );

  return readings;
}
