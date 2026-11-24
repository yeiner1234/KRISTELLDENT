import { beforeEach, describe, expect, it, vi } from 'vitest';
import { supabase } from '../lib/supabase';
import { findCall, mockQuery, type QueryCall } from '../test/mockQuery';
import {
  addProfessionalToBranch,
  createProfessional,
  getAllProfessionalsForAdmin,
  getProfessionals,
  removeProfessionalFromBranch,
  setProfessionalBranchActive,
  setProfessionalBranchServices,
  updateProfessionalProfile,
} from './professionalService';

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
    professional_branches: [{ branch_id: 'b1', active: true }],
    professional_services: [
      { service_id: 'v1', branch_id: 'b1', active: true },
      { service_id: 'v9', branch_id: 'b1', active: false },
    ],
    professional_schedules: [{ branch_id: 'b1' }, { branch_id: 'b1' }],
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

describe('getAllProfessionalsForAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('completa el nombre que la RLS de profiles no deja ver (admin_sede de otra sede)', async () => {
    vi.mocked(supabase.from).mockReturnValue(
      mockQuery({
        data: [
          { ...professionalRow('p1'), profiles: { full_name: 'Ana Torres', role: 'especialista' } },
          { ...professionalRow('p2'), profiles: null },
        ],
      }) as never,
    );
    vi.mocked(supabase.rpc).mockResolvedValue({ data: [{ id: 'p2', full_name: 'Bea Ríos' }], error: null } as never);

    const professionals = await getAllProfessionalsForAdmin();

    expect(professionals.map((professional) => professional.fullName)).toEqual(['Ana Torres', 'Bea Ríos']);
  });

  it('lee si la cuenta está activa (profiles.active), aparte de la ficha', async () => {
    vi.mocked(supabase.from).mockReturnValue(
      mockQuery({
        data: [
          { ...professionalRow('p1'), profiles: { full_name: 'Ana', role: 'especialista', active: true } },
          { ...professionalRow('p2'), profiles: { full_name: 'Prueba B', role: 'especialista', active: false } },
          { ...professionalRow('p3'), profiles: null },
          { ...professionalRow('p4'), profiles: null },
        ],
      }) as never,
    );
    // Sin perfil legible: get_public_professionals solo trae cuentas activas.
    vi.mocked(supabase.rpc).mockResolvedValue({ data: [{ id: 'p3', full_name: 'Bea' }], error: null } as never);

    const professionals = await getAllProfessionalsForAdmin();

    expect(professionals.map((professional) => [professional.id, professional.active, professional.accountActive])).toEqual([
      ['p1', true, true],
      ['p2', true, false],
      ['p3', true, true],
      ['p4', true, false],
    ]);
  });

  it('marca las sedes donde está desactivada', async () => {
    vi.mocked(supabase.from).mockReturnValue(
      mockQuery({
        data: [
          {
            ...professionalRow('p1'),
            professional_branches: [
              { branch_id: 'b1', active: true },
              { branch_id: 'b2', active: false },
            ],
            profiles: { full_name: 'Ana', role: 'especialista', active: true },
          },
        ],
      }) as never,
    );
    vi.mocked(supabase.rpc).mockResolvedValue({ data: [], error: null } as never);

    const [professional] = await getAllProfessionalsForAdmin();

    expect(professional.branchIds).toEqual(['b1', 'b2']);
    expect(professional.inactiveBranchIds).toEqual(['b2']);
  });

  it('trae los servicios activos con su sede y las sedes donde tiene horario', async () => {
    vi.mocked(supabase.from).mockReturnValue(
      mockQuery({ data: [{ ...professionalRow('p1'), profiles: { full_name: 'Ana', role: 'especialista' } }] }) as never,
    );
    vi.mocked(supabase.rpc).mockResolvedValue({ data: [], error: null } as never);

    const [professional] = await getAllProfessionalsForAdmin();

    expect(professional.serviceIds).toEqual(['v1']);
    expect(professional.assignments).toEqual([{ serviceId: 'v1', branchId: 'b1' }]);
    expect(professional.scheduleBranchIds).toEqual(['b1']);
  });
});

interface LoggedQuery {
  table: string;
  op: 'select' | 'insert' | 'update' | 'delete';
  calls: QueryCall[];
}

function setupWrites(failOn?: { table: string; op: LoggedQuery['op']; message?: string }): LoggedQuery[] {
  const log: LoggedQuery[] = [];
  vi.mocked(supabase.from).mockImplementation(
    (table: string) =>
      mockQuery((calls) => {
        const op =
          (['insert', 'update', 'delete'] as const).find((method) => calls.some((call) => call.method === method)) ??
          'select';
        log.push({ table, op, calls });
        if (failOn?.table === table && failOn.op === op) {
          return { error: { message: failOn.message ?? 'new row violates row-level security policy' } };
        }
        return {};
      }) as never,
  );
  return log;
}

function argsOf(entry: LoggedQuery, method: string): unknown[] {
  return entry.calls.find((call) => call.method === method)!.args;
}

const writes = (log: LoggedQuery[]) => log.map((entry) => `${entry.op}:${entry.table}`);

describe('createProfessional', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('crea la ficha, luego sus especialidades y luego sus sedes', async () => {
    const log = setupWrites();

    await createProfessional({ profileId: 'p1', bio: 'Hola', specialtyIds: ['s1'], branchIds: ['b1', 'b2'] });

    expect(writes(log)).toEqual([
      'insert:professionals',
      'insert:professional_specialties',
      'insert:professional_branches',
    ]);
    expect(argsOf(log[2], 'insert')[0]).toEqual([
      { professional_id: 'p1', branch_id: 'b1' },
      { professional_id: 'p1', branch_id: 'b2' },
    ]);
  });

  it('sin sede o sin especialidad no escribe nada', async () => {
    await expect(
      createProfessional({ profileId: 'p1', bio: null, specialtyIds: ['s1'], branchIds: [] }),
    ).rejects.toThrow('Elige al menos una sede.');
    await expect(
      createProfessional({ profileId: 'p1', bio: null, specialtyIds: [], branchIds: ['b1'] }),
    ).rejects.toThrow('Elige una especialidad.');
    expect(supabase.from).not.toHaveBeenCalled();
  });
});

describe('updateProfessionalProfile (datos generales: valen para todas sus sedes)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('guarda la bio y cambia solo las especialidades que cambiaron, primero las bajas', async () => {
    const log = setupWrites();

    await updateProfessionalProfile('p1', { bio: null, specialtyIds: ['s2', 's3'] }, ['s1', 's2']);

    expect(writes(log)).toEqual([
      'update:professionals',
      'delete:professional_specialties',
      'insert:professional_specialties',
    ]);
    expect(argsOf(log[1], 'in')).toEqual(['specialty_id', ['s1']]);
    expect(argsOf(log[2], 'insert')[0]).toEqual([{ professional_id: 'p1', specialty_id: 's3' }]);
  });

  it('sin cambios de especialidad solo guarda la bio', async () => {
    const log = setupWrites();

    await updateProfessionalProfile('p1', { bio: 'x', specialtyIds: ['s1'] }, ['s1']);

    expect(writes(log)).toEqual(['update:professionals']);
  });

  it('sin especialidad no escribe nada', async () => {
    await expect(updateProfessionalProfile('p1', { bio: null, specialtyIds: [] }, ['s1'])).rejects.toThrow(
      'Elige una especialidad.',
    );
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('muestra el mensaje del trigger tal cual', async () => {
    setupWrites({
      table: 'professional_specialties',
      op: 'delete',
      message: 'Primero quita sus servicios de esta especialidad en todas sus sedes.',
    });

    await expect(updateProfessionalProfile('p1', { bio: null, specialtyIds: ['s2'] }, ['s1'])).rejects.toThrow(
      'Primero quita sus servicios de esta especialidad en todas sus sedes.',
    );
  });
});

describe('sedes de una profesional', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('agrega una sede', async () => {
    const log = setupWrites();

    await addProfessionalToBranch('p1', 'b2');

    expect(log[0].table).toBe('professional_branches');
    expect(argsOf(log[0], 'insert')[0]).toEqual({ professional_id: 'p1', branch_id: 'b2' });
  });

  it('quita solo esa sede', async () => {
    const log = setupWrites();

    await removeProfessionalFromBranch('p1', 'b2');

    expect(log[0].op).toBe('delete');
    expect(log[0].calls.filter((call) => call.method === 'eq').map((call) => call.args)).toEqual([
      ['professional_id', 'p1'],
      ['branch_id', 'b2'],
    ]);
  });

  it('el mensaje de citas pendientes llega tal cual; el de RLS, traducido', async () => {
    setupWrites({
      table: 'professional_branches',
      op: 'delete',
      message: 'Tiene 2 citas pendientes en esta sede: reprográmalas o cancélalas antes de quitarla.',
    });
    await expect(removeProfessionalFromBranch('p1', 'b2')).rejects.toThrow('Tiene 2 citas pendientes en esta sede');

    setupWrites({ table: 'professional_branches', op: 'insert' });
    await expect(addProfessionalToBranch('p1', 'b2')).rejects.toThrow('No tienes permiso para modificar esta sede.');
  });
});

describe('setProfessionalBranchServices (servicios de una sede)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('inserta los nuevos y borra los quitados', async () => {
    const log = setupWrites();

    await setProfessionalBranchServices('p1', ['v1', 'v3'], ['v1', 'v2']);

    expect(writes(log)).toEqual(['delete:professional_services', 'insert:professional_services']);
    expect(argsOf(log[0], 'in')).toEqual(['service_id', ['v2']]);
    expect(argsOf(log[1], 'insert')[0]).toEqual([{ professional_id: 'p1', service_id: 'v3' }]);
  });

  it('sin cambios no escribe nada', async () => {
    const log = setupWrites();

    await setProfessionalBranchServices('p1', ['v1'], ['v1']);

    expect(log).toEqual([]);
  });
});

describe('setProfessionalBranchActive', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('activa o desactiva a la profesional solo en esa sede', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: null } as never);

    await setProfessionalBranchActive('p1', 'jaen', false);

    expect(supabase.rpc).toHaveBeenCalledWith('set_professional_branch_active', {
      p_professional_id: 'p1',
      p_branch_id: 'jaen',
      p_active: false,
    });
  });

  it('muestra el mensaje de la base', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: { message: 'No administras esta sede.' } } as never);

    await expect(setProfessionalBranchActive('p1', 'bagua', false)).rejects.toThrow('No administras esta sede.');
  });
});
