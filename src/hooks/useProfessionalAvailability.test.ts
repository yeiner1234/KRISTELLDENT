import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useProfessionalAvailability } from './useProfessionalAvailability';
import { getProfessionalWeeklySchedule } from '../services/professionalScheduleService';
import { getProfessionalExceptionsBetween } from '../services/scheduleExceptionService';

vi.mock('../services/professionalScheduleService', () => ({ getProfessionalWeeklySchedule: vi.fn() }));
vi.mock('../services/scheduleExceptionService', () => ({ getProfessionalExceptionsBetween: vi.fn() }));

describe('useProfessionalAvailability', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getProfessionalWeeklySchedule).mockResolvedValue([
      { branchId: 'A', dayOfWeek: 1, startTime: '09:00', endTime: '13:00' },
    ]);
    vi.mocked(getProfessionalExceptionsBetween).mockResolvedValue([
      {
        id: 'e1',
        professionalId: 'p1',
        branchId: null,
        date: '2026-11-16',
        isAvailable: false,
        startTime: '10:00',
        endTime: '11:00',
        reason: null,
      },
    ]);
  });

  it('sin profesional no consulta nada y no devuelve bloques', () => {
    const { result } = renderHook(() => useProfessionalAvailability('', '2026-11-16', '2026-11-22'));

    expect(getProfessionalWeeklySchedule).not.toHaveBeenCalled();
    expect(result.current.blocksFor('2026-11-16')).toEqual([]);
  });

  it('combina el horario semanal con las excepciones de la semana', async () => {
    const { result } = renderHook(() => useProfessionalAvailability('p1', '2026-11-16', '2026-11-22'));

    await waitFor(() => expect(result.current.blocksFor('2026-11-16')).toHaveLength(3));
    expect(getProfessionalExceptionsBetween).toHaveBeenCalledWith('p1', '2026-11-16', '2026-11-22');
    expect(result.current.blocksFor('2026-11-16')[1]).toEqual({ start: '10:00', end: '11:00', kind: 'absence' });
  });

  it('si falla la carga deja un mensaje de error', async () => {
    vi.mocked(getProfessionalWeeklySchedule).mockRejectedValue(new Error('sin permiso'));

    const { result } = renderHook(() => useProfessionalAvailability('p1', '2026-11-16', '2026-11-22'));

    await waitFor(() => expect(result.current.error).toBe('No se pudo cargar el horario del profesional.'));
  });
});
