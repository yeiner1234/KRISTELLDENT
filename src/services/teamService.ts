import { supabase } from '../lib/supabase';
import type { AppRole } from '../types/User';

export interface TeamMember {
  id: string;
  fullName: string;
  email: string;
  role: AppRole;
  active: boolean;
  branchNames: string[];
}

interface ProfileRow {
  id: string;
  full_name: string;
  email: string;
  role: AppRole;
  active: boolean;
}

interface AccessRow {
  user_id: string;
  branches: { name: string } | { name: string }[] | null;
}

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
      const names = Array.isArray(row.branches)
        ? row.branches.map((branch) => branch.name)
        : row.branches
          ? [row.branches.name]
          : [];
      const list = branchNamesByUser.get(row.user_id) ?? [];
      list.push(...names);
      branchNamesByUser.set(row.user_id, list);
    }
  }

  return rows.map((row) => ({
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    role: row.role,
    active: row.active,
    branchNames: branchNamesByUser.get(row.id) ?? [],
  }));
}

export async function setProfileActive(id: string, active: boolean): Promise<void> {
  const { error } = await supabase.from('profiles').update({ active }).eq('id', id);

  if (error) {
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
    throw new Error(message ?? 'No se pudo crear el usuario.');
  }

  return data;
}
