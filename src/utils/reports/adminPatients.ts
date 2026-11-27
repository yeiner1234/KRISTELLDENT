import type { Patient } from '../../types/Patient';
import { addDaysToIsoDate } from '../date';
import { maskDni, rate, type ReportAppointment } from './adminData';
import { formatPatientName } from './agenda';
import { bucketOf, type PeriodBucket } from './period';

// Reporte de pacientes (nivel global y nivel sede). Las filas llegan ya
// filtradas por sede, doctora y especialidad, sin periodo: el pasado sirve para
// saber quién es recurrente o frecuente.

export const FREQUENT_VISITS = 3;

export interface PatientsSummary {
  attended: number;
  newCount: number;
  recurrentCount: number;
  frequentCount: number;
  appointmentsPerPatient: number;
}

interface Period {
  from: string;
  to: string;
}

function completed(rows: ReportAppointment[]): ReportAppointment[] {
  return rows.filter((row) => row.status === 'completed');
}

function inPeriod(rows: ReportAppointment[], period: Period): ReportAppointment[] {
  return rows.filter((row) => row.date >= period.from && row.date <= period.to);
}

// Primera atención en la clínica (de la base); si no está, la primera visible.
export function firstVisitResolver(rows: ReportAppointment[], firstVisits: Map<string, string>): (patientId: string) => string {
  const visibleFirst = new Map<string, string>();
  for (const row of completed(rows)) {
    const current = visibleFirst.get(row.patientId);
    if (!current || row.date < current) visibleFirst.set(row.patientId, row.date);
  }
  return (patientId) => firstVisits.get(patientId) ?? visibleFirst.get(patientId) ?? '';
}

// Atendidas en los 12 meses que terminan con el periodo.
function visitsInYear(rows: ReportAppointment[], to: string): Map<string, number> {
  const start = addDaysToIsoDate(to, -364);
  const counts = new Map<string, number>();
  for (const row of completed(rows)) {
    if (row.date >= start && row.date <= to) counts.set(row.patientId, (counts.get(row.patientId) ?? 0) + 1);
  }
  return counts;
}

export function summarizePatients(rows: ReportAppointment[], period: Period, firstVisits: Map<string, string>): PatientsSummary {
  const attendedRows = inPeriod(completed(rows), period);
  const ids = [...new Set(attendedRows.map((row) => row.patientId))];
  const firstVisitOf = firstVisitResolver(rows, firstVisits);
  const yearVisits = visitsInYear(rows, period.to);
  const newCount = ids.filter((id) => firstVisitOf(id) >= period.from).length;
  return {
    attended: ids.length,
    newCount,
    recurrentCount: ids.length - newCount,
    frequentCount: ids.filter((id) => (yearVisits.get(id) ?? 0) >= FREQUENT_VISITS).length,
    appointmentsPerPatient: ids.length === 0 ? 0 : attendedRows.length / ids.length,
  };
}

export interface PatientsPoint {
  key: string;
  label: string;
  newCount: number;
  recurrentCount: number;
}

export function patientsSeries(rows: ReportAppointment[], buckets: PeriodBucket[], firstVisits: Map<string, string>): PatientsPoint[] {
  const firstVisitOf = firstVisitResolver(rows, firstVisits);
  const seen = new Map(buckets.map((bucket) => [bucket.key, new Set<string>()]));
  for (const row of completed(rows)) {
    const bucket = bucketOf(buckets, row.date);
    if (bucket) seen.get(bucket.key)?.add(row.patientId);
  }
  return buckets.map((bucket) => {
    const ids = [...(seen.get(bucket.key) ?? [])];
    const newCount = ids.filter((id) => {
      const first = firstVisitOf(id);
      return first >= bucket.from && first <= bucket.to;
    }).length;
    return { key: bucket.key, label: bucket.label, newCount, recurrentCount: ids.length - newCount };
  });
}

export interface PatientsGroupRow {
  key: string;
  label: string;
  // Especialidad y sede principal (para el desglose por doctora).
  detail: string;
  branchName: string;
  attended: number;
  newCount: number;
  recurrentCount: number;
  recurrence: number | null;
  frequentCount: number;
}

// Por sede (nuevo = primera atención en esa sede) o por doctora (nuevo =
// primera atención en la clínica), de más a menos pacientes.
export function patientsBy(
  rows: ReportAppointment[],
  period: Period,
  keyOf: (row: ReportAppointment) => string,
  labelOf: (row: ReportAppointment) => string,
  options: { firstVisits: Map<string, string>; newInGroup: boolean; detailOf?: (row: ReportAppointment) => string },
): PatientsGroupRow[] {
  const groups = new Map<string, ReportAppointment[]>();
  for (const row of rows) groups.set(keyOf(row), [...(groups.get(keyOf(row)) ?? []), row]);

  return [...groups.entries()]
    .map(([key, list]) => {
      const summary = summarizePatients(list, period, options.newInGroup ? new Map() : options.firstVisits);
      const attended = inPeriod(completed(list), period);
      const branchCounts = new Map<string, number>();
      for (const row of attended) branchCounts.set(row.branchName, (branchCounts.get(row.branchName) ?? 0) + 1);
      const mainBranch = [...branchCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';
      return {
        key,
        label: labelOf(list[0]),
        detail: options.detailOf ? options.detailOf(list[0]) : '',
        branchName: mainBranch,
        attended: summary.attended,
        newCount: summary.newCount,
        recurrentCount: summary.recurrentCount,
        recurrence: rate(summary.recurrentCount, summary.attended),
        frequentCount: summary.frequentCount,
      };
    })
    .filter((group) => group.attended > 0)
    .sort((a, b) => b.attended - a.attended || a.label.localeCompare(b.label, 'es'));
}

export interface FrequentPatientRow {
  patientId: string;
  patientName: string;
  maskedDni: string;
  branchName: string;
  doctorName: string;
  visits: number;
  lastAttention: string;
}

// Pacientes con 3 o más atenciones en los 12 meses que terminan con el periodo.
export function frequentPatients(rows: ReportAppointment[], patients: Patient[], to: string): FrequentPatientRow[] {
  const start = addDaysToIsoDate(to, -364);
  const patientById = new Map(patients.map((patient) => [patient.id, patient]));
  const byPatient = new Map<string, ReportAppointment[]>();
  for (const row of completed(rows)) {
    if (row.date < start || row.date > to) continue;
    byPatient.set(row.patientId, [...(byPatient.get(row.patientId) ?? []), row]);
  }

  return [...byPatient.entries()]
    .filter(([, list]) => list.length >= FREQUENT_VISITS)
    .map(([patientId, list]) => {
      const last = [...list].sort((a, b) => b.date.localeCompare(a.date))[0];
      const doctorCounts = new Map<string, number>();
      for (const row of list) doctorCounts.set(row.doctorName, (doctorCounts.get(row.doctorName) ?? 0) + 1);
      const patient = patientById.get(patientId);
      return {
        patientId,
        patientName: patient ? formatPatientName(patient.firstName, patient.lastName) : 'Paciente',
        maskedDni: patient ? maskDni(patient.dni) : '—',
        branchName: last.branchName,
        doctorName: [...doctorCounts.entries()].sort((a, b) => b[1] - a[1])[0][0],
        visits: list.length,
        lastAttention: last.date,
      };
    })
    .sort((a, b) => b.visits - a.visits || b.lastAttention.localeCompare(a.lastAttention));
}

export function patientsReadings(input: {
  summary: PatientsSummary;
  series: PatientsPoint[];
  // Nivel sede: recurrencia de la clínica para comparar.
  clinicRecurrence: number | null;
  groups: PatientsGroupRow[];
  isBranchLevel: boolean;
}): string[] {
  const { summary, series } = input;
  if (summary.attended === 0) return ['No hay pacientes atendidos en el periodo con los filtros elegidos.'];

  const readings: string[] = [];
  const topNew = [...series].sort((a, b) => b.newCount - a.newCount)[0];
  if (series.length >= 2 && topNew && topNew.newCount > 0) {
    readings.push(`${topNew.label} registró el mayor ingreso de pacientes nuevos (${topNew.newCount}).`);
  }

  const recurrence = rate(summary.recurrentCount, summary.attended) ?? 0;
  if (input.isBranchLevel && input.clinicRecurrence !== null) {
    const diff = recurrence - input.clinicRecurrence;
    const comparison = Math.abs(diff) < 1 ? 'en línea con' : diff > 0 ? 'por encima de' : 'por debajo de';
    readings.push(
      `La recurrencia de la sede es ${recurrence.toFixed(1)} %, ${comparison} el promedio de la clínica (${input.clinicRecurrence.toFixed(1)} %).`,
    );
  } else {
    readings.push(`${Math.round(recurrence)} % de los pacientes atendidos ya se habían atendido antes en la clínica.`);
  }

  const topFrequent = [...input.groups].sort((a, b) => b.frequentCount - a.frequentCount)[0];
  if (input.groups.length >= 2 && topFrequent && topFrequent.frequentCount > 0) {
    readings.push(`${topFrequent.label} reúne más pacientes frecuentes (${topFrequent.frequentCount}).`);
  }

  return readings;
}
