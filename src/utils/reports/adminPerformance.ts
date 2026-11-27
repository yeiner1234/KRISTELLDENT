import { rate, type ReportAppointment } from './adminData';

// Reporte de desempeño (nivel global y nivel sede): volumen de trabajo según
// las citas atendidas y la duración de cada servicio. Las horas son estimadas.

function completed(rows: ReportAppointment[]): ReportAppointment[] {
  return rows.filter((row) => row.status === 'completed');
}

export interface PerformanceSummary {
  attentions: number;
  hours: number;
  doctors: number;
  branches: number;
  attentionsPerDoctor: number;
  hoursPerDoctor: number;
  minutesPerAttention: number;
  topSpecialty: { label: string; share: number } | null;
}

export function summarizePerformance(rows: ReportAppointment[]): PerformanceSummary {
  const attended = completed(rows);
  const minutes = attended.reduce((sum, row) => sum + row.durationMinutes, 0);
  const doctors = new Set(attended.map((row) => row.professionalId)).size;
  const demand = demandBySpecialty(rows);
  return {
    attentions: attended.length,
    hours: minutes / 60,
    doctors,
    branches: new Set(attended.map((row) => row.branchId)).size,
    attentionsPerDoctor: doctors === 0 ? 0 : attended.length / doctors,
    hoursPerDoctor: doctors === 0 ? 0 : minutes / 60 / doctors,
    minutesPerAttention: attended.length === 0 ? 0 : minutes / attended.length,
    topSpecialty: demand[0] ? { label: demand[0].label, share: demand[0].share } : null,
  };
}

export interface DemandItem {
  label: string;
  value: number;
  share: number;
}

export function demandBySpecialty(rows: ReportAppointment[]): DemandItem[] {
  const attended = completed(rows);
  const counts = new Map<string, number>();
  for (const row of attended) counts.set(row.specialtyName, (counts.get(row.specialtyName) ?? 0) + 1);
  return [...counts.entries()]
    .map(([label, value]) => ({ label, value, share: rate(value, attended.length) ?? 0 }))
    .sort((a, b) => b.value - a.value);
}

export interface PerformanceRow {
  key: string;
  label: string;
  detail: string;
  doctors: number;
  attentions: number;
  patients: number;
  hours: number;
  attentionsPerDoctor: number;
  hoursPerDoctor: number;
  minutesPerAttention: number;
  cancellation: number | null;
}

function performanceOf(key: string, label: string, detail: string, list: ReportAppointment[]): PerformanceRow {
  const attended = completed(list);
  const cancelled = list.filter((row) => row.status === 'cancelled').length;
  const minutes = attended.reduce((sum, row) => sum + row.durationMinutes, 0);
  const doctors = new Set(attended.map((row) => row.professionalId)).size;
  return {
    key,
    label,
    detail,
    doctors,
    attentions: attended.length,
    patients: new Set(attended.map((row) => row.patientId)).size,
    hours: minutes / 60,
    attentionsPerDoctor: doctors === 0 ? 0 : attended.length / doctors,
    hoursPerDoctor: doctors === 0 ? 0 : minutes / 60 / doctors,
    minutesPerAttention: attended.length === 0 ? 0 : minutes / attended.length,
    cancellation: rate(cancelled, attended.length + cancelled),
  };
}

// Por sede o por doctora, de más a menos atenciones.
export function performanceBy(
  rows: ReportAppointment[],
  keyOf: (row: ReportAppointment) => string,
  labelOf: (row: ReportAppointment) => string,
  detailOf: (row: ReportAppointment) => string = () => '',
): PerformanceRow[] {
  const groups = new Map<string, ReportAppointment[]>();
  for (const row of rows) groups.set(keyOf(row), [...(groups.get(keyOf(row)) ?? []), row]);
  return [...groups.entries()]
    .map(([key, list]) => performanceOf(key, labelOf(list[0]), detailOf(list[0]), list))
    .filter((row) => row.attentions > 0 || row.cancellation !== null)
    .sort((a, b) => b.attentions - a.attentions || a.label.localeCompare(b.label, 'es'));
}

export function performanceTotal(label: string, rows: ReportAppointment[]): PerformanceRow {
  return performanceOf('total', label, '', rows);
}

export interface ServiceRankRow {
  label: string;
  specialty: string;
  attentions: number;
  share: number;
  minutes: number;
  hours: number;
}

export function servicesRanking(rows: ReportAppointment[]): ServiceRankRow[] {
  const attended = completed(rows);
  const groups = new Map<string, ReportAppointment[]>();
  for (const row of attended) groups.set(row.serviceLabel, [...(groups.get(row.serviceLabel) ?? []), row]);
  return [...groups.entries()]
    .map(([label, list]) => {
      const minutes = list.reduce((sum, row) => sum + row.durationMinutes, 0);
      return {
        label,
        specialty: list[0].specialtyName,
        attentions: list.length,
        share: rate(list.length, attended.length) ?? 0,
        minutes: Math.round(minutes / list.length),
        hours: minutes / 60,
      };
    })
    .sort((a, b) => b.attentions - a.attentions || a.label.localeCompare(b.label, 'es'));
}

export function performanceReadings(input: {
  doctors: PerformanceRow[];
  groups: PerformanceRow[];
  services: ServiceRankRow[];
}): string[] {
  const readings: string[] = [];
  const doctors = input.doctors.filter((row) => row.attentions > 0);
  if (doctors.length >= 2) {
    const first = doctors[0];
    const last = doctors[doctors.length - 1];
    readings.push(
      `${first.label} lidera en atenciones (${first.attentions}); la diferencia con la última es de ${first.attentions - last.attentions} ${first.attentions - last.attentions === 1 ? 'atención' : 'atenciones'}.`,
    );
  } else if (doctors.length === 1) {
    readings.push(`${doctors[0].label} realizó ${doctors[0].attentions} atenciones en el periodo.`);
  }

  const withCancellation = input.groups.filter((row) => row.cancellation !== null);
  if (withCancellation.length >= 2) {
    const top = [...withCancellation].sort((a, b) => (b.cancellation ?? 0) - (a.cancellation ?? 0))[0];
    readings.push(`${top.label} tiene la mayor tasa de cancelación (${(top.cancellation ?? 0).toFixed(1)} %).`);
  }

  const longest = [...input.services].sort((a, b) => b.minutes - a.minutes)[0];
  if (longest && longest.minutes >= 60) {
    readings.push(`${longest.label} ocupa ${longest.minutes} min por atención: conviene planificar su agenda en bloques largos.`);
  }

  return readings.length > 0 ? readings : ['No hay atenciones en el periodo con los filtros elegidos.'];
}
