import type { AdminProfessional } from '../types/Professional';

type Missing = 'especialidad' | 'sede' | 'servicios' | 'horario';

export interface ProfileGap {
  // null = falta algo de la ficha general, no de una sede.
  branchId: string | null;
  branchName: string | null;
  missing: Missing[];
}

interface BranchLike {
  id: string;
  name: string;
  active: boolean;
}

// "Ficha incompleta": sin especialidad, sin sede activa, o una sede activa
// donde no atiende ningún servicio o no tiene horario (ahí no aparece en la
// reserva).
export function profileGaps(professional: AdminProfessional, branches: BranchLike[]): ProfileGap[] {
  const gaps: ProfileGap[] = [];
  if (professional.specialtyIds.length === 0) {
    gaps.push({ branchId: null, branchName: null, missing: ['especialidad'] });
  }

  const activeBranches = branches.filter((branch) => branch.active && professional.branchIds.includes(branch.id));
  if (activeBranches.length === 0) {
    gaps.push({ branchId: null, branchName: null, missing: ['sede'] });
  }

  for (const branch of activeBranches) {
    const missing: Missing[] = [];
    if (!professional.assignments.some((assignment) => assignment.branchId === branch.id)) {
      missing.push('servicios');
    }
    if (!professional.scheduleBranchIds.includes(branch.id)) {
      missing.push('horario');
    }
    if (missing.length > 0) {
      gaps.push({ branchId: branch.id, branchName: branch.name, missing });
    }
  }

  return gaps;
}

export function profileGapsSummary(gaps: ProfileGap[]): string {
  return gaps
    .map((gap) =>
      gap.branchName ? `${gap.branchName}: falta ${gap.missing.join(' y ')}` : `Falta ${gap.missing.join(' y ')}`,
    )
    .join(' · ');
}
