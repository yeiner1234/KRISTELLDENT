import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useBranchWeeklyHours } from './useBranchWeeklyHours';
import { getBranchWeeklyHours } from '../services/branchScheduleService';

vi.mock('../services/branchScheduleService', () => ({ getBranchWeeklyHours: vi.fn() }));

describe('useBranchWeeklyHours', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('carga el horario semanal de la sede', async () => {
    vi.mocked(getBranchWeeklyHours).mockResolvedValue({ thu: { open: '08:00', close: '18:00' } });

    const { result } = renderHook(() => useBranchWeeklyHours('bagua'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.hours).toEqual({ thu: { open: '08:00', close: '18:00' } });
    expect(result.current.error).toBeNull();
    expect(getBranchWeeklyHours).toHaveBeenCalledWith('bagua');
  });

  it('si falla deja de cargar y da un mensaje claro', async () => {
    vi.mocked(getBranchWeeklyHours).mockRejectedValue(new Error('boom'));

    const { result } = renderHook(() => useBranchWeeklyHours('bagua'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBe('No se pudo cargar el horario de la sede.');
  });

  it('sin sede no consulta nada', () => {
    const { result } = renderHook(() => useBranchWeeklyHours(''));

    expect(result.current.isLoading).toBe(false);
    expect(getBranchWeeklyHours).not.toHaveBeenCalled();
  });
});
