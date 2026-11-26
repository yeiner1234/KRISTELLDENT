import { beforeEach, describe, expect, it, vi } from 'vitest';
import { supabase } from '../lib/supabase';
import { getAppointmentIndicators } from './indicatorService';

vi.mock('../lib/supabase', () => ({
  supabase: { rpc: vi.fn() },
}));

describe('indicatorService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('llama a appointment_indicators con el periodo y los filtros, y convierte las filas', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: [{ branch_id: 'b1', professional_id: 'p1', status: 'completed', is_past: true, total: '4' }],
      error: null,
    } as never);

    const rows = await getAppointmentIndicators({ from: '2026-11-01', to: '2026-11-30', professionalId: 'p1', branchId: '' });

    expect(supabase.rpc).toHaveBeenCalledWith('appointment_indicators', {
      p_from: '2026-11-01',
      p_to: '2026-11-30',
      p_professional_id: 'p1',
      // Sin sede elegida: todas las que la RLS deja ver.
      p_branch_id: null,
    });
    // bigint llega como texto desde PostgREST.
    expect(rows).toEqual([{ branchId: 'b1', professionalId: 'p1', status: 'completed', isPast: true, total: 4 }]);
  });

  it('lanza un error claro si la consulta falla', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: { message: 'boom' } } as never);

    await expect(getAppointmentIndicators({ from: '2026-11-01', to: '2026-11-30', professionalId: '', branchId: '' })).rejects.toThrow(
      'No se pudieron cargar los indicadores.',
    );
  });
});
