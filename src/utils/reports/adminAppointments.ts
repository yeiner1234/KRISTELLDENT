import type { AppointmentStatus } from '../../types/Appointment';
import type { Patient } from '../../types/Patient';
import { addDaysToIsoDate } from '../date';
import { createdDateInLima, isUnclosedAppointment, rate, type ReportAppointment } from './adminData';
import { formatPatientName } from './agenda';
import { daysBetween } from './period';

// Reporte de citas (nivel global y nivel sede).

export interface AppointmentsSummary {
  total: number;
  completed: number;
  cancelled: number;
  unclosed: number;
  attendanceRate: number | null;
  cancellationRate: number | null;
  // Días promedio entre el registro de la cita y su fecha.
  leadDays: number | null;
}

export function summarizeAppointments(rows: ReportAppointment[], today: string): AppointmentsSummary {
  const completed = rows.filter((row) => row.status === 'completed').length;
  const cancelled = rows.filter((row) => row.status === 'cancelled').length;
  const leads = rows
    .filter((row) => row.createdAt)
    .map((row) => Math.max(0, daysBetween(createdDateInLima(row.createdAt as string), row.date)));
  return {
    total: rows.length,
    completed,
    cancelled,
    unclosed: rows.filter((row) => isUnclosedAppointment(row, today)).length,
    attendanceRate: rate(completed, completed + cancelled),
    cancellationRate: rate(cancelled, completed + cancelled),
    leadDays: leads.length === 0 ? null : leads.reduce((sum, value) => sum + value, 0) / leads.length,
  };
}

const WEEKDAY_LABELS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

function weekdayOf(isoDate: string): number {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

// Atendidas por día de la semana, de lunes a sábado (domingo solo si hubo).
export function attendedByWeekday(rows: ReportAppointment[]): { label: string; value: number }[] {
  const counts = new Array(7).fill(0);
  for (const row of rows) {
    if (row.status === 'completed') counts[weekdayOf(row.date)] += 1;
  }
  const order = [1, 2, 3, 4, 5, 6, ...(counts[0] > 0 ? [0] : [])];
  return order.map((index) => ({ label: WEEKDAY_LABELS[index], value: counts[index] }));
}

export interface StatusStats {
  key: string;
  label: string;
  registered: number;
  completed: number;
  cancelled: number;
  unclosed: number;
  attendanceRate: number | null;
  cancellationRate: number | null;
}

function statsOf(key: string, label: string, rows: ReportAppointment[], today: string): StatusStats {
  const summary = summarizeAppointments(rows, today);
  return {
    key,
    label,
    registered: summary.total,
    completed: summary.completed,
    cancelled: summary.cancelled,
    unclosed: summary.unclosed,
    attendanceRate: summary.attendanceRate,
    cancellationRate: summary.cancellationRate,
  };
}

// Por sede o por doctora, de más a menos citas registradas.
export function statsBy(
  rows: ReportAppointment[],
  keyOf: (row: ReportAppointment) => string,
  labelOf: (row: ReportAppointment) => string,
  today: string,
): StatusStats[] {
  const groups = new Map<string, ReportAppointment[]>();
  for (const row of rows) groups.set(keyOf(row), [...(groups.get(keyOf(row)) ?? []), row]);
  return [...groups.entries()]
    .map(([key, list]) => statsOf(key, labelOf(list[0]), list, today))
    .sort((a, b) => b.registered - a.registered || a.label.localeCompare(b.label, 'es'));
}

export function totalStats(label: string, rows: ReportAppointment[], today: string): StatusStats {
  return statsOf('total', label, rows, today);
}

export interface SpecialtyStats {
  key: string;
  label: string;
  completed: number;
  share: number;
  cancelled: number;
  attendanceRate: number | null;
  avgDuration: number;
}

export function specialtyStats(rows: ReportAppointment[]): SpecialtyStats[] {
  const totalCompleted = rows.filter((row) => row.status === 'completed').length;
  const groups = new Map<string, ReportAppointment[]>();
  for (const row of rows) {
    const key = row.specialtyId ?? row.specialtyName;
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  return [...groups.entries()]
    .map(([key, list]) => {
      const completed = list.filter((row) => row.status === 'completed');
      const cancelled = list.filter((row) => row.status === 'cancelled').length;
      return {
        key,
        label: list[0].specialtyName,
        completed: completed.length,
        share: rate(completed.length, totalCompleted) ?? 0,
        cancelled,
        attendanceRate: rate(completed.length, completed.length + cancelled),
        avgDuration:
          completed.length === 0 ? 0 : completed.reduce((sum, row) => sum + row.durationMinutes, 0) / completed.length,
      };
    })
    .filter((item) => item.completed > 0 || item.cancelled > 0)
    .sort((a, b) => b.completed - a.completed);
}

function patientName(patientById: Map<string, Patient>, patientId: string): string {
  const patient = patientById.get(patientId);
  return patient ? formatPatientName(patient.firstName, patient.lastName) : 'Paciente';
}

export interface UnclosedReportRow {
  id: string;
  date: string;
  time: string;
  branchName: string;
  patientName: string;
  doctorName: string;
  status: AppointmentStatus;
  delayDays: number;
}

export function buildUnclosedReportRows(rows: ReportAppointment[], patients: Patient[], today: string): UnclosedReportRow[] {
  const patientById = new Map(patients.map((patient) => [patient.id, patient]));
  return rows
    .filter((row) => isUnclosedAppointment(row, today))
    .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime))
    .map((row) => ({
      id: row.id,
      date: row.date,
      time: row.startTime,
      branchName: row.branchName,
      patientName: patientName(patientById, row.patientId),
      doctorName: row.doctorName,
      status: row.status,
      delayDays: daysBetween(row.date, today),
    }));
}

// Último día de los próximos N días hábiles (lunes a sábado) después de hoy.
export function workingDaysLimit(today: string, workingDays: number): string {
  let date = today;
  let counted = 0;
  while (counted < workingDays) {
    date = addDaysToIsoDate(date, 1);
    if (weekdayOf(date) !== 0) counted += 1;
  }
  return date;
}

export interface ToConfirmRow {
  id: string;
  date: string;
  time: string;
  patientName: string;
  doctorName: string;
  serviceName: string;
  status: AppointmentStatus;
}

// Pendientes desde ahora hasta los próximos `workingDays` días hábiles.
export function buildToConfirmRows(
  rows: ReportAppointment[],
  patients: Patient[],
  today: string,
  nowTime: string,
  workingDays: number,
): ToConfirmRow[] {
  const patientById = new Map(patients.map((patient) => [patient.id, patient]));
  const limit = workingDaysLimit(today, workingDays);
  return rows
    .filter(
      (row) =>
        row.status === 'pending' &&
        row.date <= limit &&
        (row.date > today || (row.date === today && row.startTime >= nowTime)),
    )
    .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime))
    .map((row) => ({
      id: row.id,
      date: row.date,
      time: row.startTime,
      patientName: patientName(patientById, row.patientId),
      doctorName: row.doctorName,
      serviceName: row.serviceLabel,
      status: row.status,
    }));
}

// Nota bajo el comparativo por sede: dónde se juntan las citas sin cerrar.
export function unclosedConcentrationNote(stats: StatusStats[], totalUnclosed: number): string | null {
  const top = [...stats].sort((a, b) => b.unclosed - a.unclosed)[0];
  if (!top || top.unclosed === 0 || stats.length < 2) return null;
  return `${top.label} concentra ${top.unclosed} de las ${totalUnclosed} citas sin cerrar.`;
}

// Nota bajo la tabla por doctora: la cancelación más alta.
export function highestCancellationNote(stats: StatusStats[]): string | null {
  const ranked = stats.filter((item) => item.cancellationRate !== null && item.cancelled > 0);
  if (ranked.length < 2) return null;
  const top = [...ranked].sort((a, b) => (b.cancellationRate ?? 0) - (a.cancellationRate ?? 0))[0];
  return `${top.label} concentra la mayor tasa de cancelación (${(top.cancellationRate ?? 0).toFixed(1)} %): revisar la confirmación previa de sus citas.`;
}
