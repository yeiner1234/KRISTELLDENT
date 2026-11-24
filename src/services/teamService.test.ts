import { beforeEach, describe, expect, it, vi } from 'vitest';
import { supabase } from '../lib/supabase';
import { findCall, mockQuery, type MockQuery } from '../test/mockQuery';
import { getTeamMembers, inviteInternalUser, setMemberBranches, setProfileActive } from './teamService';

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
    functions: { invoke: vi.fn() },
  },
}));

describe('setProfileActive', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // La base (set_account_active) revisa el permiso y cambia cuenta y ficha juntas.
  it('llama a set_account_active con la persona y el estado', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: null } as never);

    await setProfileActive('u1', false);

    expect(supabase.rpc).toHaveBeenCalledWith('set_account_active', { p_user_id: 'u1', p_active: false });
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('muestra el mensaje de la base tal cual', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: null,
      error: { message: 'Atiende también en otra sede: solo la administración general puede desactivar su cuenta.' },
    } as never);

    await expect(setProfileActive('u1', false)).rejects.toThrow('Atiende también en otra sede');
  });

  it('sin la migración nueva da un mensaje claro', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: null,
      error: { message: 'Could not find the function public.set_account_active(p_active, p_user_id) in the schema cache' },
    } as never);

    await expect(setProfileActive('u1', true)).rejects.toThrow(
      'Falta aplicar la migración 20261124001000_admin_sede_activa_cuentas.sql.',
    );
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
          { professional_id: 'ana', branch_id: 'bagua', active: true, branches: { name: 'Bagua' } },
          { professional_id: 'ana', branch_id: 'jaen', active: false, branches: { name: 'Jaén' } },
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
    // Sedes donde la profesional está desactivada (solo ahí no sale en la reserva).
    expect(members.map((member) => member.inactiveBranchIds)).toEqual([['jaen'], []]);
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
