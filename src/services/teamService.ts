import { supabase } from '../lib/supabase';
import type { AppRole } from '../types/User';
import { friendlyWriteError } from '../utils/supabaseErrors';
import { PROFESSIONAL_ROLES } from './professionalService';

export interface TeamMember {
  id: string;
  fullName: string;
  email: string;
  role: AppRole;
  active: boolean;
  branchIds: string[];
  branchNames: string[];
  // true para especialista y odontóloga general: sus sedes se asignan en
  // Profesionales (professional_branches) y un trigger las copia a Equipo.
  branchesFromProfessionals: boolean;
}

interface ProfileRow {
  id: string;
  full_name: string;
  email: string;
  role: AppRole;
  active: boolean;
}

type BranchNameJoin = { name: string } | { name: string }[] | null;

interface AccessRow {
  user_id: string;
  branch_id: string;
  branches: BranchNameJoin;
}

interface ProfessionalBranchRow {
  professional_id: string;
  branch_id: string;
  branches: BranchNameJoin;
}

interface MemberBranches {
  ids: string[];
  names: string[];
}

function branchNamesOf(join: BranchNameJoin): string[] {
  if (Array.isArray(join)) return join.map((branch) => branch.name);
  return join ? [join.name] : [];
}

function addBranch(map: Map<string, MemberBranches>, userId: string, branchId: string, join: BranchNameJoin): void {
  const entry = map.get(userId) ?? { ids: [], names: [] };
  entry.ids.push(branchId);
  entry.names.push(...branchNamesOf(join));
  map.set(userId, entry);
}

export const EMAIL_TAKEN_MESSAGE =
  'Ese correo ya tiene una cuenta. Para que atienda en otra sede, agrégala en Profesionales.';

export async function getTeamMembers(): Promise<TeamMember[]> {
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, active')
    .order('full_name', { ascending: true });

  if (profilesError) {
    throw new Error(profilesError.message);
  }

  const rows = (profiles ?? []) as ProfileRow[];
  const ids = rows.map((row) => row.id);

  const branchesByUser = new Map<string, MemberBranches>();

  if (ids.length > 0) {
    const { data: accessRows, error: accessError } = await supabase
      .from('user_branch_access')
      .select('user_id, branch_id, branches(name)')
      .in('user_id', ids);

    if (accessError) {
      throw new Error(accessError.message);
    }

    for (const row of (accessRows ?? []) as unknown as AccessRow[]) {
      addBranch(branchesByUser, row.user_id, row.branch_id, row.branches);
    }
  }

  // Las profesionales muestran sus sedes de Profesionales, que es la fuente.
  const professionalIds = rows.filter((row) => PROFESSIONAL_ROLES.includes(row.role)).map((row) => row.id);
  const professionalBranches = new Map<string, MemberBranches>();

  if (professionalIds.length > 0) {
    const { data: professionalRows, error: professionalError } = await supabase
      .from('professional_branches')
      .select('professional_id, branch_id, branches(name)')
      .in('professional_id', professionalIds);

    if (professionalError) {
      throw new Error(professionalError.message);
    }

    for (const row of (professionalRows ?? []) as unknown as ProfessionalBranchRow[]) {
      addBranch(professionalBranches, row.professional_id, row.branch_id, row.branches);
    }
  }

  return rows.map((row) => {
    const isProfessional = PROFESSIONAL_ROLES.includes(row.role);
    const branches = (isProfessional ? professionalBranches : branchesByUser).get(row.id) ?? { ids: [], names: [] };
    return {
      id: row.id,
      fullName: row.full_name,
      email: row.email,
      role: row.role,
      active: row.active,
      branchIds: branches.ids,
      branchNames: branches.names,
      branchesFromProfessionals: isProfessional,
    };
  });
}

// Sedes de una técnica o administradora de sede (Equipo). Las de una
// profesional se asignan en Profesionales. La RLS deja a admin_sede tocar
// solo sus sedes y solo de técnicas.
export async function setMemberBranches(userId: string, wantedIds: string[], currentIds: string[]): Promise<void> {
  const toRemove = currentIds.filter((id) => !wantedIds.includes(id));
  const toAdd = wantedIds.filter((id) => !currentIds.includes(id));

  if (toRemove.length > 0) {
    const { error } = await supabase.from('user_branch_access').delete().eq('user_id', userId).in('branch_id', toRemove);
    if (error) throw new Error(friendlyWriteError(error.message));
  }
  if (toAdd.length > 0) {
    const { error } = await supabase
      .from('user_branch_access')
      .insert(toAdd.map((branchId) => ({ user_id: userId, branch_id: branchId })));
    if (error) throw new Error(friendlyWriteError(error.message));
  }
}

// Un perfil profesional desactivado tampoco debe ofrecerse en la reserva: su
// ficha en professionals sigue el mismo estado.
// La base (set_account_active, 20261124001000) revisa quién puede y cambia la
// cuenta y, si es profesional, también su ficha.
export async function setProfileActive(id: string, active: boolean): Promise<void> {
  const { error } = await supabase.rpc('set_account_active', { p_user_id: id, p_active: active });

  if (error) {
    if (error.message.includes('set_account_active')) {
      throw new Error('Falta aplicar la migración 20261124001000_admin_sede_activa_cuentas.sql.');
    }
    throw new Error(error.message);
  }
}

export interface InviteInternalUserInput {
  email: string;
  fullName: string;
  role: AppRole;
  branchIds: string[];
}

async function extractFunctionErrorMessage(error: unknown): Promise<string | null> {
  if (error && typeof error === 'object' && 'context' in error) {
    try {
      const context = (error as { context: Response }).context;
      const body = await context.json();
      if (typeof body?.error === 'string') {
        return body.error;
      }
    } catch {
      return null;
    }
  }
  return null;
}

export async function inviteInternalUser(input: InviteInternalUserInput): Promise<{ id: string }> {
  const { data, error } = await supabase.functions.invoke('create-internal-user', {
    body: {
      email: input.email,
      fullName: input.fullName,
      role: input.role,
      branchIds: input.branchIds,
    },
  });

  if (error) {
    const message = await extractFunctionErrorMessage(error);
    // Mismo texto que devuelve create-internal-user; se traduce también aquí
    // el error de Auth por si la función desplegada es la anterior.
    if (message?.toLowerCase().includes('already been registered')) {
      throw new Error(EMAIL_TAKEN_MESSAGE);
    }
    throw new Error(message ?? 'No se pudo crear el usuario.');
  }

  return data;
}
