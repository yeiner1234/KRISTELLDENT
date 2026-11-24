import type { AppRole } from '../types/User';

const PROFESSIONAL_ROLES: AppRole[] = ['especialista', 'odontologa_general'];
// Roles cuya cuenta puede activar o desactivar una admin_sede.
const ROLES_ADMIN_SEDE_TOGGLES: AppRole[] = ['tecnica', ...PROFESSIONAL_ROLES];

interface MemberLike {
  id: string;
  role: AppRole;
  active: boolean;
  branchIds: string[];
  inactiveBranchIds: string[];
}

interface Viewer {
  isAdminGlobal: boolean;
  // null = admin_global (todas las sedes).
  myBranchIds: string[] | null;
  selfId: string | undefined;
}

export type AccountAction =
  | { kind: 'none' }
  // Activar o desactivar la cuenta (y la ficha, si es profesional).
  | { kind: 'account'; blockedReason: string | null }
  // Activar o desactivar a la profesional solo en esa sede.
  | { kind: 'branch'; branchId: string; active: boolean };

// Botón de Equipo. La cuenta es una para todas las sedes: una admin_sede la
// desactiva solo si la persona trabaja únicamente en su sede. A una
// profesional que atiende en varias la desactiva solo en su sede (la base
// aplica lo mismo en set_account_active y set_professional_branch_active).
export function accountAction(member: MemberLike, viewer: Viewer): AccountAction {
  if (member.id === viewer.selfId) return { kind: 'none' };
  if (viewer.isAdminGlobal) return { kind: 'account', blockedReason: null };
  if (!ROLES_ADMIN_SEDE_TOGGLES.includes(member.role)) return { kind: 'none' };

  const mine = viewer.myBranchIds ?? [];
  const worksElsewhere = member.branchIds.some((branchId) => !mine.includes(branchId));
  if (!member.active || !worksElsewhere) return { kind: 'account', blockedReason: null };

  const myBranchId = member.branchIds.find((branchId) => mine.includes(branchId));
  if (PROFESSIONAL_ROLES.includes(member.role) && myBranchId) {
    return { kind: 'branch', branchId: myBranchId, active: !member.inactiveBranchIds.includes(myBranchId) };
  }
  return { kind: 'account', blockedReason: 'Trabaja también en otra sede: quítale tu sede con "Editar sedes".' };
}
