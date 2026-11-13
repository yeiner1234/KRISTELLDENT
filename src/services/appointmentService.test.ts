import { beforeEach, describe, expect, it, vi } from 'vitest';
import { supabase } from '../lib/supabase';
import { findCall, mockQuery } from '../test/mockQuery';
import { getAllAppointments, getAppointmentsByPatientDni, getAvailableSlots } from './appointmentService';

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
    functions: { invoke: vi.fn() },
  },
}));

const appointmentRow = {
  id: 'a1',
  appointment_code: 'KD-ABC234',
  patient_id: 'pt1',
  professional_id: 'p1',
  branch_id: 'b1',
  service_id: null,
  appointment_date: '2026-11-20',
  start_time: '09:00:00',
  end_time: '09:30:00',
  status: 'in_room',
  reason: null,
};

describe('appointmentService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getAllAppointments pide appointment_code y lo devuelve como code', async () => {
    const query = mockQuery({ data: [appointmentRow] });
    vi.mocked(supabase.from).mockReturnValue(query as never);

    const [appointment] = await getAllAppointments();

    expect(findCall(query, 'select')?.args[0]).toContain('appointment_code');
    expect(appointment).toMatchObject({ id: 'a1', code: 'KD-ABC234', status: 'in_room', startTime: '09:00' });
  });

  it('getAppointmentsByPatientDni mapea el código que devuelve la Edge Function', async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: {
        patient: { id: 'pt1' },
        appointments: [
          {
            id: 'a1',
            code: 'KD-ABC234',
            professionalId: 'p1',
            branchId: 'b1',
            serviceId: null,
            date: '2026-11-20',
            startTime: '09:00:00',
            endTime: '09:30:00',
            status: 'pending',
            reason: null,
          },
        ],
      },
      error: null,
    } as never);

    const [appointment] = await getAppointmentsByPatientDni('12345678');

    expect(appointment).toMatchObject({ id: 'a1', code: 'KD-ABC234', patientId: 'pt1' });
  });

  it('getAvailableSlots envía la cita a excluir al reprogramar', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: [{ slot_start: '09:00:00', slot_end: '09:30:00' }], error: null } as never);

    const slots = await getAvailableSlots({
      professionalId: 'p1',
      branchId: 'b1',
      serviceId: 's1',
      date: '2026-11-20',
      excludeAppointmentId: 'a1',
    });

    expect(supabase.rpc).toHaveBeenCalledWith('get_available_slots', {
      p_professional_id: 'p1',
      p_branch_id: 'b1',
      p_service_id: 's1',
      p_date: '2026-11-20',
      p_exclude_appointment_id: 'a1',
    });
    expect(slots).toEqual([{ time: '09:00', available: true }]);
  });

  it('getAvailableSlots sin cita a excluir envía null', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: [], error: null } as never);

    await getAvailableSlots({ professionalId: 'p1', branchId: 'b1', serviceId: null, date: '2026-11-20' });

    expect(supabase.rpc).toHaveBeenCalledWith(
      'get_available_slots',
      expect.objectContaining({ p_exclude_appointment_id: null }),
    );
  });
});
