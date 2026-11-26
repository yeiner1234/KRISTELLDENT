import type { AppointmentStatus } from '../types/Appointment';

// Una fila de la RPC appointment_indicators: cuántas citas hay de una sede,
// profesional y estado, y si su hora de fin ya pasó (hora de Lima).
export interface IndicatorRow {
  branchId: string;
  professionalId: string;
  status: AppointmentStatus;
  isPast: boolean;
  total: number;
}

// HU16. reserved = attended + noShow + cancelled + upcoming.
export interface IndicatorCounts {
  // Todas las citas del periodo.
  reserved: number;
  // Atendidas (completed).
  attended: number;
  // Pendientes o confirmadas cuya hora ya pasó: el paciente no vino.
  noShow: number;
  cancelled: number;
  // Pendientes o confirmadas que aún no pasan, y las que están en sala.
  upcoming: number;
}

export interface IndicatorBreakdown extends IndicatorCounts {
  id: string;
}

export interface IndicatorSummary {
  totals: IndicatorCounts;
  byProfessional: IndicatorBreakdown[];
  byBranch: IndicatorBreakdown[];
}

type CountKey = Exclude<keyof IndicatorCounts, 'reserved'>;

function classify(row: IndicatorRow): CountKey {
  if (row.status === 'completed') return 'attended';
  if (row.status === 'cancelled') return 'cancelled';
  if (row.status === 'in_room') return 'upcoming';
  return row.isPast ? 'noShow' : 'upcoming';
}

function emptyCounts(): IndicatorCounts {
  return { reserved: 0, attended: 0, noShow: 0, cancelled: 0, upcoming: 0 };
}

function add(counts: IndicatorCounts, row: IndicatorRow) {
  counts.reserved += row.total;
  counts[classify(row)] += row.total;
}

function breakdown(rows: IndicatorRow[], keyOf: (row: IndicatorRow) => string): IndicatorBreakdown[] {
  const groups = new Map<string, IndicatorBreakdown>();
  for (const row of rows) {
    const id = keyOf(row);
    const group = groups.get(id) ?? { id, ...emptyCounts() };
    add(group, row);
    groups.set(id, group);
  }
  return [...groups.values()].sort((a, b) => b.reserved - a.reserved);
}

export function summarizeIndicators(rows: IndicatorRow[]): IndicatorSummary {
  const totals = emptyCounts();
  for (const row of rows) {
    add(totals, row);
  }
  return {
    totals,
    byProfessional: breakdown(rows, (row) => row.professionalId),
    byBranch: breakdown(rows, (row) => row.branchId),
  };
}

// Primer y último día del mes de isoDate (AAAA-MM-DD), sin pasar por la zona horaria.
export function monthRange(isoDate: string): { from: string; to: string } {
  const [year, month] = isoDate.split('-').map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const prefix = `${year}-${String(month).padStart(2, '0')}`;
  return { from: `${prefix}-01`, to: `${prefix}-${String(lastDay).padStart(2, '0')}` };
}

// Porcentaje entero de part sobre total (0 si no hay citas).
export function indicatorShare(part: number, total: number): number {
  return total === 0 ? 0 : Math.round((part / total) * 100);
}
