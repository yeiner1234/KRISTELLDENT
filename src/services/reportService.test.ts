import { beforeEach, describe, expect, it, vi } from 'vitest';
import { supabase } from '../lib/supabase';
import {
  getBranchAttendance,
  getClinicBenchmarks,
  getMyPatientsFirstVisit,
  getPatientHistory,
  getPatientsFirstVisit,
} from './reportService';

vi.mock('../lib/supabase', () => ({
  supabase: { rpc: vi.fn() },
}));

describe('reportService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('promedio de la sede: llama a branch_attendance_summary y convierte los bigint', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: [{ completed: '894', cancelled: '106' }], error: null } as never);

    const result = await getBranchAttendance({ from: '2026-07-01', to: '2026-09-30', branchId: '' });

    expect(supabase.rpc).toHaveBeenCalledWith('branch_attendance_summary', {
      p_from: '2026-07-01',
      p_to: '2026-09-30',
      // Sin sede elegida: todas las de la profesional.
      p_branch_id: null,
    });
    expect(result).toEqual({ completed: 894, cancelled: 106 });
  });

  it('promedio de la sede: sin filas, cero', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: [], error: null } as never);

    expect(await getBranchAttendance({ from: '2026-07-01', to: '2026-09-30', branchId: 'b1' })).toEqual({
      completed: 0,
      cancelled: 0,
    });
  });

  it('primera atención de mis pacientes: mapa paciente → fecha', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: [{ patient_id: 'p1', first_completed_on: '2024-03-12' }],
      error: null,
    } as never);

    const result = await getMyPatientsFirstVisit();

    expect(supabase.rpc).toHaveBeenCalledWith('my_patients_first_visit');
    expect(result.get('p1')).toBe('2024-03-12');
  });

  it('historia del paciente: convierte las filas y recorta la hora', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: [
        {
          id: 'a1',
          appointment_date: '2026-09-18',
          start_time: '10:00:00',
          status: 'completed',
          reason: 'Dolor o sensibilidad',
          service_id: 's1',
          service_name: 'Endodoncia',
          service_sessions: 4,
          professional_id: 'd1',
          professional_name: 'Lucía Mendoza Paz',
          branch_id: 'b1',
          branch_name: 'Bagua',
        },
      ],
      error: null,
    } as never);

    const rows = await getPatientHistory('p1');

    expect(supabase.rpc).toHaveBeenCalledWith('patient_history', { p_patient_id: 'p1' });
    expect(rows).toEqual([
      {
        id: 'a1',
        date: '2026-09-18',
        startTime: '10:00',
        status: 'completed',
        reason: 'Dolor o sensibilidad',
        serviceId: 's1',
        serviceName: 'Endodoncia',
        serviceSessions: 4,
        professionalId: 'd1',
        professionalName: 'Lucía Mendoza Paz',
        branchId: 'b1',
        branchName: 'Bagua',
      },
    ]);
  });

  it('promedios de la clínica: convierte los bigint', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: [
        {
          completed: '1986',
          cancelled: '262',
          unclosed: '18',
          completed_minutes: '72780',
          doctors: '10',
          patients_attended: '1248',
          patients_recurrent: '936',
        },
      ],
      error: null,
    } as never);

    const result = await getClinicBenchmarks({ from: '2026-07-01', to: '2026-09-30' });

    expect(supabase.rpc).toHaveBeenCalledWith('clinic_benchmarks', { p_from: '2026-07-01', p_to: '2026-09-30' });
    expect(result).toEqual({
      completed: 1986,
      cancelled: 262,
      unclosed: 18,
      completedMinutes: 72780,
      doctors: 10,
      patientsAttended: 1248,
      patientsRecurrent: 936,
    });
  });

  it('primera atención de los pacientes visibles: patients_first_visit', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: [{ patient_id: 'p1', first_completed_on: '2025-01-02' }], error: null } as never);

    const result = await getPatientsFirstVisit();

    expect(supabase.rpc).toHaveBeenCalledWith('patients_first_visit');
    expect(result.get('p1')).toBe('2025-01-02');
  });

  it('lanza errores claros si la base falla', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: { message: 'boom' } } as never);

    await expect(getBranchAttendance({ from: '2026-07-01', to: '2026-09-30', branchId: '' })).rejects.toThrow(
      'No se pudo cargar el promedio de la sede.',
    );
    await expect(getMyPatientsFirstVisit()).rejects.toThrow('No se pudo cargar el historial de tus pacientes.');
    await expect(getPatientHistory('p1')).rejects.toThrow('No se pudo cargar la historia del paciente.');
    await expect(getClinicBenchmarks({ from: '2026-07-01', to: '2026-09-30' })).rejects.toThrow(
      'No se pudo cargar el promedio de la clínica.',
    );
    await expect(getPatientsFirstVisit()).rejects.toThrow('No se pudo cargar el historial de los pacientes.');
  });
});
