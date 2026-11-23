import { supabase } from '../lib/supabase';
import type { AppRole } from '../types/User';
import { PROFESSIONAL_ROLES } from './professionalService';

export interface TeamMember {
  id: string;
  fullName: string;
  email: string;
  role: AppRole;
  active: boolean;
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
  branches: BranchNameJoin;
}

interface ProfessionalBranchRow {
  professional_id: string;
  branches: BranchNameJoin;
}

function branchNamesOf(join: BranchNameJoin): string[] {
  if (Array.isArray(join)) return join.map((branch) => branch.name);
  return join ? [join.name] : [];
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

  const branchNamesByUser = new Map<string, string[]>();

  if (ids.length > 0) {
    const { data: accessRows, error: accessError } = await supabase
      .from('user_branch_access')
      .select('user_id, branches(name)')
      .in('user_id', ids);

    if (accessError) {
      throw new Error(accessError.message);
    }

    for (const row of (accessRows ?? []) as unknown as AccessRow[]) {
      const list = branchNamesByUser.get(row.user_id) ?? [];
      list.push(...branchNamesOf(row.branches));
      branchNamesByUser.set(row.user_id, list);
    }
  }

  // Las profesionales muestran sus sedes de Profesionales, que es la fuente.
  const professionalIds = rows.filter((row) => PROFESSIONAL_ROLES.includes(row.role)).map((row) => row.id);
  const professionalBranchNames = new Map<string, string[]>();

  if (professionalIds.length > 0) {
    const { data: professionalRows, error: professionalError } = await supabase
      .from('professional_branches')
      .select('professional_id, branches(name)')
      .in('professional_id', professionalIds);

    if (professionalError) {
      throw new Error(professionalError.message);
    }

    for (const row of (professionalRows ?? []) as unknown as ProfessionalBranchRow[]) {
      const list = professionalBranchNames.get(row.professional_id) ?? [];
      list.push(...branchNamesOf(row.branches));
      professionalBranchNames.set(row.professional_id, list);
    }
  }

  return rows.map((row) => ({
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    role: row.role,
    active: row.active,
    branchNames: PROFESSIONAL_ROLES.includes(row.role)
      ? (professionalBranchNames.get(row.id) ?? [])
      : (branchNamesByUser.get(row.id) ?? []),
    branchesFromProfessionals: PROFESSIONAL_ROLES.includes(row.role),
  }));
}

// Un perfil profesional desactivado tampoco debe ofrecerse en la reserva: su
// ficha en professionals sigue el mismo estado.
export async function setProfileActive(id: string, active: boolean): Promise<void> {
  const { data, error } = await supabase.from('profiles').update({ active }).eq('id', id).select('role').single();

  if (error) {
    throw new Error(error.message);
  }

  if (PROFESSIONAL_ROLES.includes((data as { role: AppRole }).role)) {
    const { error: professionalError } = await supabase.from('professionals').update({ active }).eq('id', id);

    if (professionalError) {
      throw new Error(professionalError.message);
    }
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
