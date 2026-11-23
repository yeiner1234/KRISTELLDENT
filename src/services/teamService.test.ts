import { beforeEach, describe, expect, it, vi } from 'vitest';
import { supabase } from '../lib/supabase';
import { findCall, mockQuery, type MockQuery } from '../test/mockQuery';
import { getTeamMembers, inviteInternalUser, setMemberBranches, setProfileActive } from './teamService';

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    functions: { invoke: vi.fn() },
  },
}));

function setup(role: string, profileError: { message: string } | null = null): Record<string, MockQuery> {
  const queries: Record<string, MockQuery> = {
    profiles: mockQuery({ data: { role }, error: profileError }),
    professionals: mockQuery({}),
  };
  vi.mocked(supabase.from).mockImplementation((table: string) => queries[table] as never);
  return queries;
}

describe('setProfileActive', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('al desactivar una odontóloga general también desactiva su ficha profesional', async () => {
    const queries = setup('odontologa_general');

    await setProfileActive('u1', false);

    expect(findCall(queries.profiles, 'update')?.args[0]).toEqual({ active: false });
    expect(findCall(queries.professionals, 'update')?.args[0]).toEqual({ active: false });
    expect(findCall(queries.professionals, 'eq')?.args).toEqual(['id', 'u1']);
  });

  it('al activar una especialista también activa su ficha profesional', async () => {
    const queries = setup('especialista');

    await setProfileActive('u1', true);

    expect(findCall(queries.professionals, 'update')?.args[0]).toEqual({ active: true });
  });

  it('no toca professionals si el rol no es profesional', async () => {
    setup('tecnica');

    await setProfileActive('u1', false);

    expect(supabase.from).not.toHaveBeenCalledWith('professionals');
  });

  it('propaga el error de Supabase', async () => {
    setup('especialista', { message: 'permission denied for table profiles' });

    await expect(setProfileActive('u1', false)).rejects.toThrow('permission denied for table profiles');
    expect(supabase.from).not.toHaveBeenCalledWith('professionals');
  });
});

describe('getTeamMembers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('las sedes de una profesional salen de Profesionales; las del resto, de Equipo', async () => {
    const queries: Record<string, MockQuery> = {
      profiles: mockQuery({
        data: [
          { id: 'ana', full_name: 'ANali', email: 'ana@x.pe', role: 'especialista', active: true },
          { id: 'tec', full_name: 'Tere', email: 'tere@x.pe', role: 'tecnica', active: true },
        ],
      }),
      user_branch_access: mockQuery({
        data: [
          { user_id: 'ana', branch_id: 'bagua', branches: { name: 'Bagua' } },
          { user_id: 'tec', branch_id: 'jaen', branches: { name: 'Jaén' } },
        ],
      }),
      professional_branches: mockQuery({
        data: [
          { professional_id: 'ana', branch_id: 'bagua', branches: { name: 'Bagua' } },
          { professional_id: 'ana', branch_id: 'jaen', branches: { name: 'Jaén' } },
        ],
      }),
    };
    vi.mocked(supabase.from).mockImplementation((table: string) => queries[table] as never);

    const members = await getTeamMembers();

    expect(members.map((member) => [member.fullName, member.branchNames, member.branchesFromProfessionals])).toEqual([
      ['ANali', ['Bagua', 'Jaén'], true],
      ['Tere', ['Jaén'], false],
    ]);
    expect(findCall(queries.professional_branches, 'in')?.args).toEqual(['professional_id', ['ana']]);
    expect(members.map((member) => member.branchIds)).toEqual([['bagua', 'jaen'], ['jaen']]);
  });
});

describe('setMemberBranches (sedes de técnicas y administradoras en Equipo)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('agrega y quita solo lo que cambió', async () => {
    const tables: { table: string; query: MockQuery }[] = [];
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      const query = mockQuery({});
      tables.push({ table, query });
      return query as never;
    });

    await setMemberBranches('tec', ['jaen', 'bagua'], ['jaen', 'chacha']);

    const [removal, addition] = tables.map((entry) => entry.query);
    expect(findCall(removal, 'delete')).toBeDefined();
    expect(findCall(removal, 'in')?.args).toEqual(['branch_id', ['chacha']]);
    expect(findCall(addition, 'insert')?.args[0]).toEqual([{ user_id: 'tec', branch_id: 'bagua' }]);
    expect(tables.every((entry) => entry.table === 'user_branch_access')).toBe(true);
  });

  it('el rechazo de RLS (sede ajena) se explica', async () => {
    vi.mocked(supabase.from).mockReturnValue(
      mockQuery({ error: { message: 'new row violates row-level security policy for table "user_branch_access"' } }) as never,
    );

    await expect(setMemberBranches('tec', ['bagua'], [])).rejects.toThrow('No tienes permiso para modificar esta sede.');
  });
});

describe('inviteInternalUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const failWith = (message: string) =>
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: null,
      error: { context: new Response(JSON.stringify({ error: message }), { status: 400 }) },
    } as never);

  const input = { email: 'ana@x.pe', fullName: 'ANali', role: 'especialista' as const, branchIds: ['jaen'] };

  it('traduce el correo ya registrado en Auth', async () => {
    failWith('A user with this email address has already been registered');

    await expect(inviteInternalUser(input)).rejects.toThrow(
      'Ese correo ya tiene una cuenta. Para que atienda en otra sede, agrégala en Profesionales.',
    );
  });

  it('deja pasar los demás errores de la función', async () => {
    failWith('No puedes asignar sedes que no te pertenecen.');

    await expect(inviteInternalUser(input)).rejects.toThrow('No puedes asignar sedes que no te pertenecen.');
  });
});
