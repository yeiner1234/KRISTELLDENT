import type { AdminProfessional } from '../types/Professional';

export interface ProfessionalStatus {
  label: 'Activa' | 'Cuenta desactivada (Equipo)' | 'Ficha desactivada';
  tone: 'adm-active' | 'adm-inactive';
}

// Estado de la profesional, el mismo que usa la reserva: hace falta la cuenta
// (Equipo) y la ficha (Profesionales). Se nombra primero la cuenta, porque
// activar la ficha no sirve mientras la cuenta esté desactivada.
export function professionalStatus(professional: Pick<AdminProfessional, 'active' | 'accountActive'>): ProfessionalStatus {
  if (!professional.accountActive) return { label: 'Cuenta desactivada (Equipo)', tone: 'adm-inactive' };
  if (!professional.active) return { label: 'Ficha desactivada', tone: 'adm-inactive' };
  return { label: 'Activa', tone: 'adm-active' };
}

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

  // Donde está desactivada a propósito no se le pide nada.
  const inactive = professional.inactiveBranchIds ?? [];

  for (const branch of activeBranches.filter((item) => !inactive.includes(item.id))) {
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
