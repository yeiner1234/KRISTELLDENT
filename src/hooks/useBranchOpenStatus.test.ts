import { describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useBranchOpenStatus } from './useBranchOpenStatus';
import { getBranchWeeklyHours } from '../services/branchScheduleService';

vi.mock('../services/branchScheduleService', () => ({ getBranchWeeklyHours: vi.fn() }));

describe('useBranchOpenStatus', () => {
  it('si no carga el horario, avisa que no está disponible', async () => {
    vi.mocked(getBranchWeeklyHours).mockRejectedValue(new Error('Failed to fetch'));

    const { result } = renderHook(() => useBranchOpenStatus('b1'));

    await waitFor(() => expect(result.current.todayLabel).toBe('Horario no disponible'));
    expect(result.current.isOpen).toBe(false);
  });
});
