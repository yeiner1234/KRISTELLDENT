import { addDaysToIsoDate } from '../date';
import { rate, type ReportAppointment } from './adminData';
import { bucketOf, type PeriodBucket } from './period';

// Reporte de ingresos (solo administración). Estimado: citas atendidas × el
// precio guardado en la cita al reservar (o el vigente si la cita no lo tiene).
// No reemplaza la caja ni los comprobantes.

function completed(rows: ReportAppointment[]): ReportAppointment[] {
  return rows.filter((row) => row.status === 'completed');
}

function sumPrice(rows: ReportAppointment[]): number {
  return rows.reduce((sum, row) => sum + row.price, 0);
}

export interface RevenueSummary {
  income: number;
  attentions: number;
  ticket: number;
  notRealized: number;
  cancelledCount: number;
  projected: number;
  projectedCount: number;
  topSpecialty: { label: string; share: number } | null;
}

// periodRows: citas del periodo. scopeRows: todas (sin periodo), para lo
// programado en los próximos 30 días desde hoy.
export function summarizeRevenue(
  periodRows: ReportAppointment[],
  scopeRows: ReportAppointment[],
  today: string,
  nowTime: string,
): RevenueSummary {
  const attended = completed(periodRows);
  const cancelled = periodRows.filter((row) => row.status === 'cancelled');
  const income = sumPrice(attended);
  const limit = addDaysToIsoDate(today, 30);
  const upcoming = scopeRows.filter(
    (row) =>
      (row.status === 'pending' || row.status === 'confirmed') &&
      row.date <= limit &&
      (row.date > today || (row.date === today && row.startTime >= nowTime)),
  );
  const bySpecialty = revenueBy(periodRows, (row) => row.specialtyName, (row) => row.specialtyName);
  return {
    income,
    attentions: attended.length,
    ticket: attended.length === 0 ? 0 : income / attended.length,
    notRealized: sumPrice(cancelled),
    cancelledCount: cancelled.length,
    projected: sumPrice(upcoming),
    projectedCount: upcoming.length,
    topSpecialty: bySpecialty[0] ? { label: bySpecialty[0].label, share: bySpecialty[0].share } : null,
  };
}

export function revenueSeries(rows: ReportAppointment[], buckets: PeriodBucket[]): { label: string; value: number }[] {
  const totals = new Map(buckets.map((bucket) => [bucket.key, 0]));
  for (const row of completed(rows)) {
    const bucket = bucketOf(buckets, row.date);
    if (bucket) totals.set(bucket.key, (totals.get(bucket.key) ?? 0) + row.price);
  }
  return buckets.map((bucket) => ({ label: bucket.label, value: totals.get(bucket.key) ?? 0 }));
}

export interface RevenueRow {
  key: string;
  label: string;
  detail: string;
  attentions: number;
  income: number;
  ticket: number;
  share: number;
  // Por servicio: precio vigente hoy.
  listPrice: number | null;
}

// Por sede, especialidad, doctora o servicio, de mayor a menor ingreso.
export function revenueBy(
  rows: ReportAppointment[],
  keyOf: (row: ReportAppointment) => string,
  labelOf: (row: ReportAppointment) => string,
  detailOf: (row: ReportAppointment) => string = () => '',
): RevenueRow[] {
  const attended = completed(rows);
  const total = sumPrice(attended);
  const groups = new Map<string, ReportAppointment[]>();
  for (const row of attended) groups.set(keyOf(row), [...(groups.get(keyOf(row)) ?? []), row]);
  return [...groups.entries()]
    .map(([key, list]) => {
      const income = sumPrice(list);
      return {
        key,
        label: labelOf(list[0]),
        detail: detailOf(list[0]),
        attentions: list.length,
        income,
        ticket: income / list.length,
        share: rate(income, total) ?? 0,
        listPrice: list[0].listPrice,
      };
    })
    .sort((a, b) => b.income - a.income || a.label.localeCompare(b.label, 'es'));
}

export function revenueReadings(input: { byService: RevenueRow[]; summary: RevenueSummary }): string[] {
  const readings: string[] = [];
  const { byService, summary } = input;
  if (summary.attentions === 0) return ['No hay atenciones valorizadas en el periodo con los filtros elegidos.'];

  // Servicios que aportan mucho con pocas atenciones.
  const attentionsTotal = byService.reduce((sum, row) => sum + row.attentions, 0);
  const highValue = byService.filter((row) => row.share >= 10 && rate(row.attentions, attentionsTotal)! < row.share / 2);
  if (highValue.length > 0) {
    readings.push(
      `${highValue.map((row) => row.label).join(' y ')} ${highValue.length === 1 ? 'concentra' : 'concentran'} buena parte del ingreso con pocas atenciones: conviene proteger esos horarios en la agenda.`,
    );
  }
  if (summary.cancelledCount > 0) {
    const amount = `S/ ${Math.round(summary.notRealized).toLocaleString('en-US')}`;
    readings.push(
      summary.cancelledCount === 1
        ? `La cita cancelada dejó de sumar un estimado de ${amount}.`
        : `Las ${summary.cancelledCount} citas canceladas dejaron de sumar un estimado de ${amount}.`,
    );
  }
  return readings;
}
