import { beforeEach, describe, expect, it, vi } from 'vitest';
import { supabase } from '../lib/supabase';
import { findCall, mockQuery, type MockQuery } from '../test/mockQuery';
import { setProfileActive } from './teamService';

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
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
