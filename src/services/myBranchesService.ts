import { supabase } from '../lib/supabase';
import { PROFESSIONAL_ROLES } from './professionalService';
import type { AppRole } from '../types/User';

export interface MyPanelBranches {
  // Sedes de la persona con sesión.
  branchIds: string[];
  // Sedes donde tiene horario el día pedido.
  todayBranchIds: string[];
}

async function branchIdsOf(
  query: PromiseLike<{ data: unknown; error: { message: string } | null }>,
): Promise<string[]> {
  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }
  return [...new Set(((data ?? []) as { branch_id: string }[]).map((row) => row.branch_id))];
}

// Sedes para el selector del panel profesional. La especialista y la
// odontóloga general atienden donde dice Profesionales y tienen horario
// propio; la técnica pertenece a las sedes de Equipo y su "horario de hoy" es
// el de las sedes que abren ese día.
export async function getMyPanelBranches(userId: string, role: AppRole, dayOfWeek: number): Promise<MyPanelBranches> {
  if (PROFESSIONAL_ROLES.includes(role)) {
    const [branchIds, todayBranchIds] = await Promise.all([
      branchIdsOf(supabase.from('professional_branches').select('branch_id').eq('professional_id', userId)),
      branchIdsOf(
        supabase
          .from('professional_schedules')
          .select('branch_id')
          .eq('professional_id', userId)
          .eq('day_of_week', dayOfWeek),
      ),
    ]);
    return { branchIds, todayBranchIds };
  }

  const branchIds = await branchIdsOf(supabase.from('user_branch_access').select('branch_id').eq('user_id', userId));
  if (branchIds.length === 0) {
    return { branchIds, todayBranchIds: [] };
  }

  const todayBranchIds = await branchIdsOf(
    supabase.from('branch_schedules').select('branch_id').in('branch_id', branchIds).eq('day_of_week', dayOfWeek),
  );
  return { branchIds, todayBranchIds };
}
