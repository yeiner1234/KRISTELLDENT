import { beforeEach, describe, expect, it, vi } from 'vitest';
import { supabase } from '../lib/supabase';
import { mockQuery } from '../test/mockQuery';
import { setBranchSchedule } from './branchScheduleService';

vi.mock('../lib/supabase', () => ({
  supabase: { from: vi.fn() },
}));

describe('setBranchSchedule', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('traduce el bloqueo de permisos al guardar el horario de otra sede', async () => {
    vi.mocked(supabase.from)
      .mockReturnValueOnce(mockQuery({}) as never)
      .mockReturnValueOnce(
        mockQuery({ error: { message: 'new row violates row-level security policy for table "branch_schedules"' } }) as never,
      );

    await expect(setBranchSchedule('b1', [{ dayOfWeek: 1, openTime: '08:00', closeTime: '18:00' }])).rejects.toThrow(
      'No tienes permiso para modificar esta sede.',
    );
  });
});
