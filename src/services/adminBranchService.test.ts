import { beforeEach, describe, expect, it, vi } from 'vitest';
import { supabase } from '../lib/supabase';
import { mockQuery } from '../test/mockQuery';
import { getManageableBranchIds, setBranchActive } from './adminBranchService';

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    auth: { getUser: vi.fn() },
  },
}));

describe('getManageableBranchIds', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(supabase.auth.getUser).mockResolvedValue({ data: { user: { id: 'u1' } }, error: null } as never);
  });

  it('admin_global gestiona todas las sedes (null)', async () => {
    vi.mocked(supabase.from).mockReturnValue(mockQuery({ data: { role: 'admin_global' } }) as never);

    await expect(getManageableBranchIds()).resolves.toBeNull();
  });

  it('admin_sede gestiona solo las sedes de user_branch_access', async () => {
    vi.mocked(supabase.from).mockImplementation(
      (table: string) =>
        (table === 'profiles'
          ? mockQuery({ data: { role: 'admin_sede' } })
          : mockQuery({ data: [{ branch_id: 'b1' }, { branch_id: 'b2' }] })) as never,
    );

    await expect(getManageableBranchIds()).resolves.toEqual(['b1', 'b2']);
  });
});

describe('setBranchActive', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('muestra tal cual el mensaje del trigger de citas pendientes', async () => {
    vi.mocked(supabase.from).mockReturnValue(
      mockQuery({ error: { message: 'No se puede desactivar: la sede tiene 2 citas pendientes.' } }) as never,
    );

    await expect(setBranchActive('b1', false)).rejects.toThrow('No se puede desactivar: la sede tiene 2 citas pendientes.');
  });

  it('traduce la sede vieja sin región', async () => {
    vi.mocked(supabase.from).mockReturnValue(
      mockQuery({
        error: { message: 'new row for relation "branches" violates check constraint "branches_region_required"' },
      }) as never,
    );

    await expect(setBranchActive('b1', false)).rejects.toThrow(
      'La sede no tiene región: edítala y agrégala antes de cambiarla.',
    );
  });
});
