import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useAppointmentIndicators } from './useAppointmentIndicators';
import { getAppointmentIndicators, type IndicatorFilters } from '../services/indicatorService';

vi.mock('../services/indicatorService', () => ({ getAppointmentIndicators: vi.fn() }));

const filters: IndicatorFilters = { from: '2026-11-01', to: '2026-11-30', professionalId: '', branchId: '' };

describe('useAppointmentIndicators', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('carga las filas y las resume', async () => {
    vi.mocked(getAppointmentIndicators).mockResolvedValue([
      { branchId: 'b1', professionalId: 'p1', status: 'completed', isPast: true, total: 3 },
      { branchId: 'b1', professionalId: 'p1', status: 'cancelled', isPast: false, total: 1 },
    ]);

    const { result } = renderHook(() => useAppointmentIndicators(filters));

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(getAppointmentIndicators).toHaveBeenCalledWith(filters);
    expect(result.current.summary.totals).toMatchObject({ reserved: 4, attended: 3, cancelled: 1 });
    expect(result.current.error).toBeNull();
  });

  it('vuelve a consultar cuando cambian los filtros', async () => {
    vi.mocked(getAppointmentIndicators).mockResolvedValue([]);
    const { result, rerender } = renderHook(({ value }) => useAppointmentIndicators(value), { initialProps: { value: filters } });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    rerender({ value: { ...filters, professionalId: 'p2' } });

    await waitFor(() => expect(getAppointmentIndicators).toHaveBeenLastCalledWith({ ...filters, professionalId: 'p2' }));
  });

  it('si falla, deja de cargar y muestra el mensaje (sin ruedita infinita)', async () => {
    vi.mocked(getAppointmentIndicators).mockRejectedValue(new Error('No se pudieron cargar los indicadores.'));

    const { result } = renderHook(() => useAppointmentIndicators(filters));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBe('No se pudieron cargar los indicadores.');
  });
});
