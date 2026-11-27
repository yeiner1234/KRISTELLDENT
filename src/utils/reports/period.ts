import { addDaysToIsoDate } from '../date';

// Periodos de los reportes del Sprint 4 (Mis citas, Mis pacientes). Fechas
// AAAA-MM-DD en UTC: no dependen de la zona del navegador.

export interface ReportPeriod {
  from: string;
  to: string;
}

export type ReportGrouping = 'monthly' | 'weekly';

export const REPORT_GROUPING_OPTIONS: { value: ReportGrouping; label: string }[] = [
  { value: 'monthly', label: 'Mensual' },
  { value: 'weekly', label: 'Semanal' },
];

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'set', 'oct', 'nov', 'dic'];
const MONTH_NAMES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Setiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];
const DAY_MS = 86_400_000;

function parts(isoDate: string): [number, number, number] {
  const [year, month, day] = isoDate.split('-').map(Number);
  return [year, month, day];
}

function toIso(year: number, month: number, day: number): string {
  return new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10);
}

function lastDayOfMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

// Mueve la fecha N meses; si el día no existe (31 de abril), el último del mes.
function addMonths(isoDate: string, months: number): string {
  const [year, month, day] = parts(isoDate);
  const index = year * 12 + (month - 1) + months;
  const targetYear = Math.floor(index / 12);
  const targetMonth = (index % 12) + 1;
  return toIso(targetYear, targetMonth, Math.min(day, lastDayOfMonth(targetYear, targetMonth)));
}

// Días de a hasta b (b - a).
export function daysBetween(a: string, b: string): number {
  const [ya, ma, da] = parts(a);
  const [yb, mb, db] = parts(b);
  return Math.round((Date.UTC(yb, mb - 1, db) - Date.UTC(ya, ma - 1, da)) / DAY_MS);
}

export function periodDays(from: string, to: string): number {
  return daysBetween(from, to) + 1;
}

// Los últimos tres meses: desde el día 1 de hace dos meses hasta hoy.
export function defaultReportPeriod(today: string): ReportPeriod {
  const [year, month] = parts(today);
  return { from: addMonths(toIso(year, month, 1), -2), to: today };
}

// Periodo con el que se compara: si empieza el día 1, los mismos meses hacia
// atrás (jul–set → abr–jun); si no, los mismos días justo antes.
export function previousPeriod(from: string, to: string): ReportPeriod {
  const [fromYear, fromMonth, fromDay] = parts(from);
  const [toYear, toMonth, toDay] = parts(to);
  if (fromDay === 1) {
    const months = (toYear - fromYear) * 12 + (toMonth - fromMonth) + 1;
    const isMonthEnd = toDay === lastDayOfMonth(toYear, toMonth);
    const previousTo = addMonths(to, -months);
    const [pYear, pMonth] = parts(previousTo);
    return {
      from: addMonths(from, -months),
      to: isMonthEnd ? toIso(pYear, pMonth, lastDayOfMonth(pYear, pMonth)) : previousTo,
    };
  }
  const length = periodDays(from, to);
  return { from: addDaysToIsoDate(from, -length), to: addDaysToIsoDate(from, -1) };
}

function dayMonth(isoDate: string): string {
  const [, month, day] = parts(isoDate);
  return `${String(day).padStart(2, '0')} ${MONTHS[month - 1]}`;
}

// "01 jul – 30 set 2026"; con años distintos, cada fecha con el suyo.
export function formatPeriodRange(from: string, to: string): string {
  const [fromYear] = parts(from);
  const [toYear] = parts(to);
  if (fromYear === toYear) return `${dayMonth(from)} – ${dayMonth(to)} ${toYear}`;
  return `${dayMonth(from)} ${fromYear} – ${dayMonth(to)} ${toYear}`;
}

// "abr – jun 2026" si son meses completos; si no, el rango con días.
export function formatComparisonRange(from: string, to: string): string {
  const [fromYear, fromMonth, fromDay] = parts(from);
  const [toYear, toMonth, toDay] = parts(to);
  if (fromDay === 1 && toDay === lastDayOfMonth(toYear, toMonth) && fromYear === toYear) {
    return fromMonth === toMonth
      ? `${MONTHS[fromMonth - 1]} ${toYear}`
      : `${MONTHS[fromMonth - 1]} – ${MONTHS[toMonth - 1]} ${toYear}`;
  }
  return formatPeriodRange(from, to);
}

// "12 mar 2024".
export function formatDayMonthYear(isoDate: string): string {
  const [year, month, day] = parts(isoDate);
  return `${day} ${MONTHS[month - 1]} ${year}`;
}

// dd/mm/aaaa.
export function formatDmy(isoDate: string): string {
  const [year, month, day] = parts(isoDate);
  return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
}

export interface PeriodBucket {
  key: string;
  label: string;
  // Parte del periodo que cae en el tramo.
  from: string;
  to: string;
}

export function monthBuckets(from: string, to: string): PeriodBucket[] {
  const buckets: PeriodBucket[] = [];
  let [year, month] = parts(from);
  const [toYear, toMonth] = parts(to);
  while (year < toYear || (year === toYear && month <= toMonth)) {
    const start = toIso(year, month, 1);
    const end = toIso(year, month, lastDayOfMonth(year, month));
    buckets.push({
      key: start.slice(0, 7),
      label: MONTH_NAMES[month - 1],
      from: start < from ? from : start,
      to: end > to ? to : end,
    });
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return buckets;
}

function mondayOf(isoDate: string): string {
  const [year, month, day] = parts(isoDate);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return addDaysToIsoDate(isoDate, weekday === 0 ? -6 : 1 - weekday);
}

export function periodBuckets(from: string, to: string, grouping: ReportGrouping): PeriodBucket[] {
  if (grouping === 'monthly') return monthBuckets(from, to);
  const buckets: PeriodBucket[] = [];
  for (let monday = mondayOf(from); monday <= to; monday = addDaysToIsoDate(monday, 7)) {
    const sunday = addDaysToIsoDate(monday, 6);
    const [, month, day] = parts(monday);
    buckets.push({
      key: monday,
      label: `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}`,
      from: monday < from ? from : monday,
      to: sunday > to ? to : sunday,
    });
  }
  return buckets;
}

// Tramo donde cae una fecha (o undefined si está fuera del periodo).
export function bucketOf(buckets: PeriodBucket[], isoDate: string): PeriodBucket | undefined {
  return buckets.find((bucket) => isoDate >= bucket.from && isoDate <= bucket.to);
}

// Variación en %, con un decimal; sin base para comparar, null.
export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}
