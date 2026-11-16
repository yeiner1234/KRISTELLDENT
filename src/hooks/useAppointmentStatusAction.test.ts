import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useAppointmentStatusAction } from './useAppointmentStatusAction';
import { setAppointmentStatus } from '../services/appointmentService';
import type { Appointment } from '../types/Appointment';

vi.mock('../services/appointmentService', () => ({ setAppointmentStatus: vi.fn() }));

const appointment = { id: 'a1', status: 'confirmed' } as Appointment;

describe('useAppointmentStatusAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('cambia el estado y avisa para recargar la lista', async () => {
    vi.mocked(setAppointmentStatus).mockResolvedValue();
    const onDone = vi.fn();
    const { result } = renderHook(() => useAppointmentStatusAction(onDone));

    let ok = false;
    await act(async () => {
      ok = await result.current.run(appointment, 'in_room');
    });

    expect(ok).toBe(true);
    expect(setAppointmentStatus).toHaveBeenCalledWith('a1', 'in_room');
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(result.current.pendingId).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('si el servidor rechaza el cambio, muestra su mensaje y libera el botón', async () => {
    vi.mocked(setAppointmentStatus).mockRejectedValue(new Error('Una cita completada no puede pasar a en sala.'));
    const onDone = vi.fn();
    const { result } = renderHook(() => useAppointmentStatusAction(onDone));

    let ok = true;
    await act(async () => {
      ok = await result.current.run(appointment, 'in_room');
    });

    expect(ok).toBe(false);
    expect(result.current.error).toBe('Una cita completada no puede pasar a en sala.');
    expect(result.current.pendingId).toBeNull();
    expect(onDone).not.toHaveBeenCalled();

    act(() => result.current.clearError());
    expect(result.current.error).toBeNull();
  });
});
