import { beforeEach, describe, expect, it, vi } from 'vitest';
import { supabase } from '../lib/supabase';
import { findCall, mockQuery, type MockQuery } from '../test/mockQuery';
import { getTeamMembers, inviteInternalUser, setProfileActive } from './teamService';

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
          { user_id: 'ana', branches: { name: 'Bagua' } },
          { user_id: 'tec', branches: { name: 'Jaén' } },
        ],
      }),
      professional_branches: mockQuery({
        data: [
          { professional_id: 'ana', branches: { name: 'Bagua' } },
          { professional_id: 'ana', branches: { name: 'Jaén' } },
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
