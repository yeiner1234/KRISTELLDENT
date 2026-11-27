import type { Branch } from '../../types/Branch';
import { doctorInitials } from './agenda';

// Datos comunes del encabezado de los reportes del Sprint 4.

// "Sede Bagua · Comercio N.° 367"; con "Todas mis sedes", los nombres.
export function reportBranchLine(
  branchId: string,
  panelBranches: { id: string; name: string }[],
  branches: Pick<Branch, 'id' | 'name' | 'address'>[],
): string {
  if (branchId) {
    const branch = branches.find((item) => item.id === branchId);
    const name = branch?.name ?? panelBranches.find((item) => item.id === branchId)?.name ?? '';
    return branch?.address ? `Sede ${name} · ${branch.address}` : `Sede ${name}`;
  }
  if (panelBranches.length === 0) return 'Todas sus sedes';
  return `${panelBranches.length === 1 ? 'Sede' : 'Sedes'} ${panelBranches.map((item) => item.name).join(' · ')}`;
}

// REP-CIT-LM-2026-1014: prefijo, iniciales de quien emite y fecha de emisión.
export function reportDocumentCode(prefix: string, fullName: string, today: string): string {
  const [year, month, day] = today.split('-');
  const initials = fullName.trim() ? doctorInitials(fullName) : '';
  return [prefix, initials, year, `${month}${day}`].filter(Boolean).join('-');
}

export interface ReportTrend {
  value: number;
  text: string;
  good: boolean;
}

// Variación de una tarjeta. good: si subir es bueno (las cancelaciones, no).
export function trendFromChange(change: number | null, unit: '%' | 'pp', good: boolean): ReportTrend | null {
  if (change === null) return null;
  const amount = Math.abs(change).toFixed(1);
  return { value: change, text: unit === '%' ? `${amount} % vs. periodo anterior` : `${amount} pp`, good };
}
