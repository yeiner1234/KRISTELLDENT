import type { Appointment } from '../../types/Appointment';
import type { Patient } from '../../types/Patient';
import { addDaysToIsoDate } from '../date';
import { formatPatientName } from './agenda';
import { appointmentServiceName, matchesBranchAndService } from './myAppointments';
import { bucketOf, type PeriodBucket } from './period';

// Lógica del reporte "Mis pacientes" (nivel especialista). Recibe solo las
// citas de la profesional con sesión y, aparte, la fecha de la primera
// atención de cada paciente en la clínica (con cualquier profesional).

export type PatientTypeFilter = 'all' | 'new' | 'recurrent' | 'frequent';

export const PATIENT_TYPE_OPTIONS: { value: PatientTypeFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'new', label: 'Nuevos' },
  { value: 'recurrent', label: 'Recurrentes' },
  { value: 'frequent', label: 'Frecuentes' },
];

// Frecuente: 3 o más citas atendidas en los últimos 12 meses (hasta el fin del periodo).
export const FREQUENT_MIN_VISITS = 3;

export interface MyPatientsFilters {
  from: string;
  to: string;
  branchId: string;
  serviceName: string;
  type: PatientTypeFilter;
}

export interface MyPatientRow {
  patientId: string;
  patientName: string;
  dni: string;
  // Nuevo: su primera atención en la clínica cae en el periodo.
  type: 'new' | 'recurrent';
  frequent: boolean;
  completedCount: number;
  lastAttention: string;
  lastService: string;
  nextAppointment: string | null;
}

function completedInPeriod(appointments: Appointment[], filters: Omit<MyPatientsFilters, 'type'>): Appointment[] {
  return appointments.filter(
    (appointment) =>
      appointment.status === 'completed' &&
      appointment.date >= filters.from &&
      appointment.date <= filters.to &&
      matchesBranchAndService(appointment, filters),
  );
}

// Primera atención en la clínica; si la base no la dio, la primera con ella.
function firstVisitResolver(appointments: Appointment[], firstVisits: Map<string, string>): (patientId: string) => string {
  const ownFirst = new Map<string, string>();
  for (const appointment of appointments) {
    if (appointment.status !== 'completed') continue;
    const current = ownFirst.get(appointment.patientId);
    if (!current || appointment.date < current) ownFirst.set(appointment.patientId, appointment.date);
  }
  return (patientId) => firstVisits.get(patientId) ?? ownFirst.get(patientId) ?? '';
}

export function buildMyPatientRows(
  appointments: Appointment[],
  patients: Patient[],
  firstVisits: Map<string, string>,
  filters: MyPatientsFilters,
  today: string,
  nowTime: string,
): MyPatientRow[] {
  const patientById = new Map(patients.map((patient) => [patient.id, patient]));
  const firstVisitOf = firstVisitResolver(appointments, firstVisits);
  const yearStart = addDaysToIsoDate(filters.to, -364);

  const byPatient = new Map<string, Appointment[]>();
  for (const appointment of completedInPeriod(appointments, filters)) {
    byPatient.set(appointment.patientId, [...(byPatient.get(appointment.patientId) ?? []), appointment]);
  }

  const rows: MyPatientRow[] = [...byPatient.entries()].map(([patientId, attended]) => {
    const last = [...attended].sort((a, b) => b.date.localeCompare(a.date) || b.startTime.localeCompare(a.startTime))[0];
    const own = appointments.filter((appointment) => appointment.patientId === patientId);
    const next = own
      .filter(
        (appointment) =>
          (appointment.status === 'pending' || appointment.status === 'confirmed') &&
          (appointment.date > today || (appointment.date === today && appointment.startTime >= nowTime)),
      )
      .map((appointment) => appointment.date)
      .sort()[0];
    const visitsInYear = own.filter(
      (appointment) => appointment.status === 'completed' && appointment.date >= yearStart && appointment.date <= filters.to,
    ).length;
    const patient = patientById.get(patientId);

    return {
      patientId,
      patientName: patient ? formatPatientName(patient.firstName, patient.lastName) : 'Paciente',
      dni: patient?.dni ?? '—',
      type: firstVisitOf(patientId) >= filters.from ? 'new' : 'recurrent',
      frequent: visitsInYear >= FREQUENT_MIN_VISITS,
      completedCount: attended.length,
      lastAttention: last.date,
      lastService: appointmentServiceName(last),
      nextAppointment: next ?? null,
    };
  });

  return rows
    .filter((row) => {
      if (filters.type === 'new') return row.type === 'new';
      if (filters.type === 'recurrent') return row.type === 'recurrent';
      if (filters.type === 'frequent') return row.frequent;
      return true;
    })
    .sort(
      (a, b) =>
        b.completedCount - a.completedCount ||
        b.lastAttention.localeCompare(a.lastAttention) ||
        a.patientName.localeCompare(b.patientName, 'es'),
    );
}

export interface MyPatientsSummary {
  attended: number;
  newCount: number;
  recurrentCount: number;
  frequentCount: number;
  withoutNext: number;
  appointmentsPerPatient: number;
}

export function summarizeMyPatients(rows: MyPatientRow[]): MyPatientsSummary {
  const attended = rows.length;
  const totalAppointments = rows.reduce((sum, row) => sum + row.completedCount, 0);
  return {
    attended,
    newCount: rows.filter((row) => row.type === 'new').length,
    recurrentCount: rows.filter((row) => row.type === 'recurrent').length,
    frequentCount: rows.filter((row) => row.frequent).length,
    withoutNext: rows.filter((row) => !row.nextAppointment).length,
    appointmentsPerPatient: attended === 0 ? 0 : totalAppointments / attended,
  };
}

export interface PatientPoint {
  key: string;
  label: string;
  newCount: number;
  recurrentCount: number;
}

// Pacientes distintos atendidos en cada tramo: nuevo si su primera atención en
// la clínica cae en ese tramo.
export function buildPatientSeries(
  appointments: Appointment[],
  firstVisits: Map<string, string>,
  filters: Omit<MyPatientsFilters, 'type'>,
  buckets: PeriodBucket[],
): PatientPoint[] {
  const firstVisitOf = firstVisitResolver(appointments, firstVisits);
  const seen = new Map(buckets.map((bucket) => [bucket.key, new Set<string>()]));
  for (const appointment of completedInPeriod(appointments, filters)) {
    const bucket = bucketOf(buckets, appointment.date);
    if (bucket) seen.get(bucket.key)?.add(appointment.patientId);
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

export function myPatientsReadings(input: { summary: MyPatientsSummary; series: PatientPoint[] }): string[] {
  const { summary, series } = input;
  if (summary.attended === 0) {
    return ['No atendió pacientes en el periodo con los filtros elegidos.'];
  }

  const readings = [
    `${Math.round((summary.recurrentCount / summary.attended) * 100)} % de sus pacientes ya se habían atendido antes en la clínica.`,
  ];

  if (series.length >= 2) {
    const first = series[0];
    const last = series[series.length - 1];
    const trend = last.newCount > first.newCount ? 'subieron' : last.newCount < first.newCount ? 'bajaron' : 'se mantuvieron';
    readings.push(
      `Los pacientes nuevos ${trend} de ${first.newCount} en ${first.label.toLowerCase()} a ${last.newCount} en ${last.label.toLowerCase()}.`,
    );
  }

  readings.push(
    summary.withoutNext === 0
      ? 'Todos sus pacientes tienen una próxima cita programada.'
      : `${summary.withoutNext} ${summary.withoutNext === 1 ? 'paciente no tiene' : 'pacientes no tienen'} una próxima cita: conviene programar su seguimiento.`,
  );

  return readings;
}
