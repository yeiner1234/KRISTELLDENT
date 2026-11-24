// Lógica pura de create-internal-user: sin imports de Deno ni de Supabase
// para poder probarla con Vitest (logic.test.ts).

export type AppRole = 'admin_global' | 'admin_sede' | 'especialista' | 'odontologa_general' | 'tecnica';

// admin_global no está: nunca se crea desde la app (spec 11.1).
const CREATABLE_ROLES: AppRole[] = ['admin_sede', 'especialista', 'odontologa_general', 'tecnica'];
const ROLES_ADMIN_SEDE_CAN_CREATE: AppRole[] = ['especialista', 'odontologa_general', 'tecnica'];
const PROFESSIONAL_ROLES: AppRole[] = ['especialista', 'odontologa_general'];

export const ADMIN_GLOBAL_FORBIDDEN =
  'Una administradora global no se crea desde la app: se crea desde Supabase (ver README).';

export const ADMIN_SEDE_SINGLE_BRANCH = 'Una administradora de sede administra una sola sede: elige solo una.';

export interface CreateUserPayload {
  email?: unknown;
  fullName?: unknown;
  role?: unknown;
  branchIds?: unknown;
}

export interface ValidCreateUser {
  email: string;
  fullName: string;
  role: AppRole;
  branchIds: string[];
}

export type CreateUserValidation = { ok: true; value: ValidCreateUser } | { ok: false; status: number; error: string };

interface Caller {
  role: string;
  // Sedes de quien llama (user_branch_access); solo cuentan para admin_sede.
  branchIds: string[];
}

// Especialista y odontóloga general atienden citas: se crean con su ficha en
// professionals y sus sedes en professional_branches.
export function isProfessionalRole(role: string): boolean {
  return (PROFESSIONAL_ROLES as string[]).includes(role);
}

export function validateCreateUserRequest(payload: CreateUserPayload, caller: Caller): CreateUserValidation {
  if (caller.role !== 'admin_global' && caller.role !== 'admin_sede') {
    return { ok: false, status: 403, error: 'No tienes permisos para crear usuarios.' };
  }

  const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : '';
  const fullName = typeof payload.fullName === 'string' ? payload.fullName.trim() : '';
  const role = typeof payload.role === 'string' ? payload.role : '';
  const branchIds = Array.isArray(payload.branchIds)
    ? [...new Set(payload.branchIds.filter((id): id is string => typeof id === 'string' && id.length > 0))]
    : [];

  if (role === 'admin_global') {
    return { ok: false, status: 403, error: ADMIN_GLOBAL_FORBIDDEN };
  }
  if (!email || !fullName || !(CREATABLE_ROLES as string[]).includes(role)) {
    return { ok: false, status: 400, error: 'Datos incompletos o rol inválido.' };
  }
  if (branchIds.length === 0) {
    return { ok: false, status: 400, error: 'Debes asignar al menos una sede para este rol.' };
  }

  if (role === 'admin_sede' && branchIds.length > 1) {
    return { ok: false, status: 400, error: ADMIN_SEDE_SINGLE_BRANCH };
  }

  if (caller.role === 'admin_sede') {
    if (!(ROLES_ADMIN_SEDE_CAN_CREATE as string[]).includes(role)) {
      return {
        ok: false,
        status: 403,
        error: 'Un admin de sede solo puede crear especialistas, odontólogas generales o técnicas.',
      };
    }
    if (branchIds.some((id) => !caller.branchIds.includes(id))) {
      return { ok: false, status: 403, error: 'No puedes asignar sedes que no te pertenecen.' };
    }
  }

  return { ok: true, value: { email, fullName, role: role as AppRole, branchIds } };
}
