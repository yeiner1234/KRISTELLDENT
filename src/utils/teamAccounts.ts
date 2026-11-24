import type { AppRole } from '../types/User';

export const OTHER_BRANCH_DEACTIVATION =
  'Atiende también en otra sede: solo la administración general puede desactivar su cuenta.';

// Roles cuya cuenta puede activar o desactivar una admin_sede.
const ROLES_ADMIN_SEDE_TOGGLES: AppRole[] = ['tecnica', 'especialista', 'odontologa_general'];

interface MemberLike {
  id: string;
  role: AppRole;
  active: boolean;
  branchIds: string[];
}

interface Viewer {
  isAdminGlobal: boolean;
  // null = admin_global (todas las sedes).
  myBranchIds: string[] | null;
  selfId: string | undefined;
}

// Botón Activar / Desactivar de Equipo. La misma regla la aplica la base en
// set_account_active: admin_sede activa a cualquiera de su sede, pero solo
// desactiva a quien trabaja únicamente en sus sedes (desactivar la cuenta la
// quita de la reserva en todas).
export function accountToggle(member: MemberLike, viewer: Viewer): { show: boolean; blockedReason: string | null } {
  if (member.id === viewer.selfId) return { show: false, blockedReason: null };
  if (viewer.isAdminGlobal) return { show: true, blockedReason: null };
  if (!ROLES_ADMIN_SEDE_TOGGLES.includes(member.role)) return { show: false, blockedReason: null };

  const mine = viewer.myBranchIds ?? [];
  const worksElsewhere = member.branchIds.some((branchId) => !mine.includes(branchId));
  return { show: true, blockedReason: member.active && worksElsewhere ? OTHER_BRANCH_DEACTIVATION : null };
}
