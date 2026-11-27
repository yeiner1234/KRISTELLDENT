import type { Branch } from '../../types/Branch';
import { buildDocumentCode } from './agenda';

// Encabezado y alcance de los reportes de administración: el nivel depende del
// rol (global o sede); la sede elegida, de los filtros.

export interface AdminReportScope {
  level: 'Nivel global' | 'Nivel sede';
  levelKey: 'global' | 'sede';
  branchLine: string;
  scope: string;
  branchFilter: string;
  // "todas las sedes" / "la sede Bagua", para los subtítulos.
  place: string;
  // Sede de la hoja; null = todas.
  branchName: string | null;
}

export function adminReportScope(input: {
  isGlobal: boolean;
  branchId: string;
  allowedBranches: Pick<Branch, 'id' | 'name' | 'address'>[];
}): AdminReportScope {
  const { isGlobal, branchId, allowedBranches } = input;
  // La admin de sede ve su sede (la primera si tuviera más de una elegida).
  const branch = allowedBranches.find((item) => item.id === branchId) ?? (isGlobal ? undefined : allowedBranches[0]);
  const levelKey = isGlobal ? 'global' : 'sede';
  const level = isGlobal ? 'Nivel global' : 'Nivel sede';

  if (!branch) {
    return {
      level,
      levelKey,
      branchLine: allowedBranches.map((item) => item.name).join(' · '),
      scope: `Todas las sedes (${allowedBranches.length})`,
      branchFilter: `Todas (${allowedBranches.length})`,
      place: 'todas las sedes',
      branchName: null,
    };
  }

  return {
    level,
    levelKey,
    branchLine: branch.address ? `Sede ${branch.name} · ${branch.address}` : `Sede ${branch.name}`,
    scope: isGlobal ? `Sede ${branch.name}` : `Solo sede ${branch.name}`,
    branchFilter: isGlobal ? branch.name : `${branch.name} (asignada)`,
    place: `la sede ${branch.name}`,
    branchName: branch.name,
  };
}

// REP-CIT-BAG-2026-1014 (sede) o REP-CIT-GLO-2026-1014 (todas las sedes).
export function adminDocumentCode(prefix: string, branchName: string | null, today: string): string {
  if (!branchName) {
    const [year, month, day] = today.split('-');
    return `${prefix}-GLO-${year}-${month}${day}`;
  }
  return buildDocumentCode(branchName, today).replace(/^AGE/, prefix);
}

// Doctoras de las sedes del filtro (la elegida o todas las permitidas), por nombre.
export function doctorsInScope(
  professionals: { id: string; fullName: string; branchIds: string[] }[],
  allowedBranchIds: string[],
  branchId: string,
): { id: string; name: string }[] {
  const branchIds = branchId ? [branchId] : allowedBranchIds;
  return professionals
    .filter((professional) => professional.fullName && professional.branchIds.some((id) => branchIds.includes(id)))
    .map((professional) => ({ id: professional.id, name: `Dra. ${professional.fullName}` }))
    .sort((a, b) => a.name.localeCompare(b.name, 'es'));
}

// Especialidad de la doctora: la odontóloga general atiende de todo.
export function doctorSpecialty(
  professional: { role: string | null; specialtyIds: string[] } | undefined,
  specialties: { id: string; name: string }[],
): string {
  if (!professional) return '—';
  if (professional.role === 'odontologa_general') return 'Odontología general';
  return specialties.find((specialty) => specialty.id === professional.specialtyIds[0])?.name ?? '—';
}
