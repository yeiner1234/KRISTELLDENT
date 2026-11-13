import { beforeEach, describe, expect, it, vi } from 'vitest';
import { supabase } from '../lib/supabase';
import { findCall, mockQuery, type QueryCall } from '../test/mockQuery';
import { getProfessionals, updateProfessional } from './professionalService';

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
    auth: { getUser: vi.fn() },
  },
}));

function professionalRow(id: string) {
  return {
    id,
    bio: null,
    active: true,
    professional_specialties: [{ specialty_id: 's1' }],
    professional_branches: [{ branch_id: 'b1' }],
    professional_services: [{ service_id: 'v1' }],
  };
}

describe('getProfessionals', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('no lee profiles y toma los nombres de get_public_professionals', async () => {
    const query = mockQuery({ data: [professionalRow('p1')] });
    vi.mocked(supabase.from).mockReturnValue(query as never);
    vi.mocked(supabase.rpc).mockResolvedValue({ data: [{ id: 'p1', full_name: 'Ana Torres' }], error: null } as never);

    const professionals = await getProfessionals();

    expect(findCall(query, 'select')?.args[0]).not.toContain('profiles');
    expect(supabase.rpc).toHaveBeenCalledWith('get_public_professionals');
    expect(professionals).toEqual([
      {
        id: 'p1',
        fullName: 'Ana Torres',
        role: null,
        bio: null,
        active: true,
        specialtyIds: ['s1'],
        branchIds: ['b1'],
        serviceIds: ['v1'],
      },
    ]);
  });

  it('omite al profesional sin nombre público (perfil inactivo)', async () => {
    vi.mocked(supabase.from).mockReturnValue(mockQuery({ data: [professionalRow('p1'), professionalRow('p2')] }) as never);
    vi.mocked(supabase.rpc).mockResolvedValue({ data: [{ id: 'p1', full_name: 'Ana Torres' }], error: null } as never);

    const professionals = await getProfessionals();

    expect(professionals.map((professional) => professional.id)).toEqual(['p1']);
  });

  it('propaga el error del RPC', async () => {
    vi.mocked(supabase.from).mockReturnValue(mockQuery({ data: [professionalRow('p1')] }) as never);
    vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: { message: 'permission denied' } } as never);

    await expect(getProfessionals()).rejects.toThrow('permission denied');
  });
});

type Relations = Record<'professional_specialties' | 'professional_branches' | 'professional_services', string[]>;

const relationColumns = {
  professional_specialties: 'specialty_id',
  professional_branches: 'branch_id',
  professional_services: 'service_id',
} as const;

interface LoggedQuery {
  table: string;
  op: 'select' | 'insert' | 'update' | 'delete';
  calls: QueryCall[];
}

function setupRelations(options: {
  role: 'admin_global' | 'admin_sede';
  adminBranchIds?: string[];
  current: Relations;
  failOn?: { table: string; op: LoggedQuery['op'] };
}): LoggedQuery[] {
  const log: LoggedQuery[] = [];

  vi.mocked(supabase.auth.getUser).mockResolvedValue({ data: { user: { id: 'u1' } }, error: null } as never);
  vi.mocked(supabase.from).mockImplementation(
    (table: string) =>
      mockQuery((calls) => {
        const op = (['insert', 'update', 'delete'] as const).find((method) => calls.some((call) => call.method === method)) ?? 'select';
        log.push({ table, op, calls });

        if (options.failOn?.table === table && options.failOn.op === op) {
          return { error: { message: 'new row violates row-level security policy' } };
        }
        if (op !== 'select') return {};
        if (table === 'profiles') return { data: { role: options.role } };
        if (table === 'user_branch_access') {
          return { data: (options.adminBranchIds ?? []).map((branchId) => ({ branch_id: branchId })) };
        }
        const relation = table as keyof Relations;
        return { data: options.current[relation].map((id) => ({ [relationColumns[relation]]: id })) };
      }) as never,
  );

  return log;
}

function insertedIds(log: LoggedQuery[], table: keyof Relations): string[] {
  return log
    .filter((entry) => entry.table === table && entry.op === 'insert')
    .flatMap((entry) => entry.calls.find((call) => call.method === 'insert')!.args[0] as Record<string, string>[])
    .map((row) => row[relationColumns[table]]);
}

function deletedIds(log: LoggedQuery[], table: keyof Relations): string[] {
  return log
    .filter((entry) => entry.table === table && entry.op === 'delete')
    .flatMap((entry) => entry.calls.find((call) => call.method === 'in')!.args[1] as string[]);
}

const current: Relations = {
  professional_specialties: ['s1'],
  professional_branches: ['b1', 'bAjena'],
  professional_services: ['v1', 'v2'],
};

const input = { bio: null, specialtyIds: ['s2'], branchIds: ['b1', 'b2'], serviceIds: ['v1'] };

describe('updateProfessional (relaciones por diferencia)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('inserta solo lo nuevo y borra solo lo quitado', async () => {
    const log = setupRelations({ role: 'admin_global', current });

    await updateProfessional('p1', input);

    expect(insertedIds(log, 'professional_specialties')).toEqual(['s2']);
    expect(deletedIds(log, 'professional_specialties')).toEqual(['s1']);
    expect(insertedIds(log, 'professional_branches')).toEqual(['b2']);
    expect(insertedIds(log, 'professional_services')).toEqual([]);
    expect(deletedIds(log, 'professional_services')).toEqual(['v2']);
  });

  it('borra antes de insertar (el especialista cambia de especialidad sin chocar con el trigger)', async () => {
    const log = setupRelations({ role: 'admin_global', current });

    await updateProfessional('p1', input);

    const writes = log.filter((entry) => entry.op === 'insert' || entry.op === 'delete');
    const lastDelete = writes.map((entry) => entry.op).lastIndexOf('delete');
    const firstInsert = writes.map((entry) => entry.op).indexOf('insert');
    expect(lastDelete).toBeGreaterThanOrEqual(0);
    expect(lastDelete).toBeLessThan(firstInsert);
  });

  it('admin_global puede quitar cualquier sede', async () => {
    const log = setupRelations({ role: 'admin_global', current });

    await updateProfessional('p1', input);

    expect(deletedIds(log, 'professional_branches')).toEqual(['bAjena']);
  });

  it('admin_sede no toca las sedes que no son suyas', async () => {
    const log = setupRelations({ role: 'admin_sede', adminBranchIds: ['b1', 'b2'], current });

    await updateProfessional('p1', input);

    expect(deletedIds(log, 'professional_branches')).toEqual([]);
    expect(insertedIds(log, 'professional_branches')).toEqual(['b2']);
  });

  it('sin cambios no inserta ni borra', async () => {
    const log = setupRelations({ role: 'admin_global', current });

    await updateProfessional('p1', {
      bio: null,
      specialtyIds: ['s1'],
      branchIds: ['b1', 'bAjena'],
      serviceIds: ['v1', 'v2'],
    });

    expect(log.filter((entry) => entry.op === 'insert' || entry.op === 'delete')).toEqual([]);
  });

  it('propaga el error de Supabase', async () => {
    setupRelations({ role: 'admin_global', current, failOn: { table: 'professional_services', op: 'delete' } });

    await expect(updateProfessional('p1', input)).rejects.toThrow('new row violates row-level security policy');
  });
});
