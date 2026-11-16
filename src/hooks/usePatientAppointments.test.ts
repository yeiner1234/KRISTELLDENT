import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { usePatientAppointments } from './usePatientAppointments';
import { getPatientAppointments } from '../services/appointmentService';

vi.mock('../services/appointmentService', () => ({ getPatientAppointments: vi.fn() }));

describe('usePatientAppointments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('carga el nombre y las citas del paciente', async () => {
    vi.mocked(getPatientAppointments).mockResolvedValue({ patientName: 'Lucía Paz', appointments: [{ id: 'a1' }] as never });

    const { result } = renderHook(() => usePatientAppointments('12345678', 'KD-ABC234'));

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(getPatientAppointments).toHaveBeenCalledWith('12345678', 'KD-ABC234');
    expect(result.current.patientName).toBe('Lucía Paz');
    expect(result.current.appointments).toHaveLength(1);
    expect(result.current.error).toBeNull();
  });

  it('si falla, deja de cargar y muestra el mensaje', async () => {
    vi.mocked(getPatientAppointments).mockRejectedValue(new Error('El DNI y el código no coinciden.'));

    const { result } = renderHook(() => usePatientAppointments('12345678', 'KD-ABC234'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBe('El DNI y el código no coinciden.');
  });

  it('refetch vuelve a pedir las citas', async () => {
    vi.mocked(getPatientAppointments).mockResolvedValue({ patientName: 'Lucía Paz', appointments: [] });
    const { result } = renderHook(() => usePatientAppointments('12345678', 'KD-ABC234'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.refetch());

    await waitFor(() => expect(getPatientAppointments).toHaveBeenCalledTimes(2));
  });

  it('sin DNI o código no consulta nada', () => {
    const { result } = renderHook(() => usePatientAppointments(undefined, undefined));
    expect(getPatientAppointments).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
  });
});
