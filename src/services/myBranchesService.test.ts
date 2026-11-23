import { beforeEach, describe, expect, it, vi } from 'vitest';
import { supabase } from '../lib/supabase';
import { findCall, mockQuery, type MockQuery } from '../test/mockQuery';
import { getMyPanelBranches } from './myBranchesService';

vi.mock('../lib/supabase', () => ({
  supabase: { from: vi.fn() },
}));

function respondByTable(results: Record<string, Parameters<typeof mockQuery>[0]>): Record<string, MockQuery> {
  const queries: Record<string, MockQuery> = {};
  vi.mocked(supabase.from).mockImplementation((table: string) => {
    queries[table] = mockQuery(results[table] ?? {});
    return queries[table] as never;
  });
  return queries;
}

describe('getMyPanelBranches', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('profesional: sus sedes de Profesionales y las de su horario de hoy', async () => {
    const queries = respondByTable({
      professional_branches: { data: [{ branch_id: 'bagua' }, { branch_id: 'jaen' }] },
      professional_schedules: { data: [{ branch_id: 'jaen' }, { branch_id: 'jaen' }] },
    });

    const result = await getMyPanelBranches('u1', 'especialista', 1);

    expect(result).toEqual({ branchIds: ['bagua', 'jaen'], todayBranchIds: ['jaen'] });
    expect(findCall(queries.professional_branches, 'eq')?.args).toEqual(['professional_id', 'u1']);
    expect(queries.professional_schedules.calls.filter((call) => call.method === 'eq').map((call) => call.args)).toEqual([
      ['professional_id', 'u1'],
      ['day_of_week', 1],
    ]);
  });

  it('técnica: sus sedes de Equipo y las que abren hoy', async () => {
    const queries = respondByTable({
      user_branch_access: { data: [{ branch_id: 'bagua' }, { branch_id: 'jaen' }] },
      branch_schedules: { data: [{ branch_id: 'bagua' }] },
    });

    const result = await getMyPanelBranches('t1', 'tecnica', 6);

    expect(result).toEqual({ branchIds: ['bagua', 'jaen'], todayBranchIds: ['bagua'] });
    expect(findCall(queries.branch_schedules, 'in')?.args).toEqual(['branch_id', ['bagua', 'jaen']]);
    expect(findCall(queries.branch_schedules, 'eq')?.args).toEqual(['day_of_week', 6]);
  });

  it('propaga el error de Supabase', async () => {
    respondByTable({ professional_branches: { error: { message: 'sin red' } } });

    await expect(getMyPanelBranches('u1', 'odontologa_general', 1)).rejects.toThrow('sin red');
  });
});
