import { beforeEach, describe, expect, it, vi } from 'vitest';
import { supabase } from '../lib/supabase';
import { findCall, mockQuery } from '../test/mockQuery';
import {
  createPublicAppointment,
  getAllAppointments,
  cancelPatientAppointment,
  getAvailableSlots,
  getPatientAppointments,
  requestAppointmentCodes,
  reschedulePatientAppointment,
  rescheduleAppointment,
} from './appointmentService';

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

  it('getAllAppointments trae cuándo se registró la cita (anticipación de reserva)', async () => {
    const query = mockQuery({ data: [{ ...appointmentRow, created_at: '2026-11-15T14:00:00+00:00' }] });
    vi.mocked(supabase.from).mockReturnValue(query as never);

    const [appointment] = await getAllAppointments();

    expect(findCall(query, 'select')?.args[0]).toContain('created_at');
    expect(appointment.createdAt).toBe('2026-11-15T14:00:00+00:00');
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

  it('rescheduleAppointment reprograma con la RPC reschedule_appointment', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: null } as never);

    await rescheduleAppointment('a1', { date: '2026-11-20', startTime: '09:00' });

    expect(supabase.rpc).toHaveBeenCalledWith('reschedule_appointment', {
      p_appointment_id: 'a1',
      p_date: '2026-11-20',
      p_start_time: '09:00',
    });
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('rescheduleAppointment muestra el error de horario fuera del horario libre', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: null,
      error: { code: 'P0001', message: 'Ese horario está fuera del horario libre del profesional.' },
    } as never);

    await expect(rescheduleAppointment('a1', { date: '2026-11-20', startTime: '23:00' })).rejects.toThrow(
      'Ese horario está fuera del horario libre del profesional.',
    );
  });

  it('rescheduleAppointment avisa si el paciente ya tiene otra cita a esa hora', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: null,
      error: {
        code: '23P01',
        message: 'conflicting key value violates exclusion constraint "appointments_no_patient_overlap"',
      },
    } as never);

    await expect(rescheduleAppointment('a1', { date: '2026-11-20', startTime: '09:00' })).rejects.toThrow(
      'El paciente ya tiene otra cita que se cruza con ese horario.',
    );
  });

  it('rescheduleAppointment avisa si el horario del profesional ya está ocupado', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: null,
      error: { code: '23P01', message: 'conflicting key value violates exclusion constraint "appointments_no_overlap"' },
    } as never);

    await expect(rescheduleAppointment('a1', { date: '2026-11-20', startTime: '09:00' })).rejects.toThrow(
      'Ese horario ya no está disponible. Elige otro.',
    );
  });

  describe('createPublicAppointment', () => {
    const input = {
      dni: '12345678',
      firstName: 'Ana',
      lastName: 'Ríos',
      email: 'ana@correo.pe',
      phone: '987654321',
      professionalId: 'p1',
      branchId: 'b1',
      serviceId: 's1',
      date: '2026-11-20',
      startTime: '09:00',
      reason: 'Dolor',
    };

    it('no envía endTime y devuelve el código de la cita', async () => {
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: { id: 'a1', code: 'KD-ABC234', patientId: 'pt1', date: '2026-11-20', startTime: '09:00:00', endTime: '09:45:00', status: 'pending' },
        error: null,
      } as never);

      const result = await createPublicAppointment(input);

      const body = vi.mocked(supabase.functions.invoke).mock.calls[0][1]?.body as Record<string, unknown>;
      expect(body).not.toHaveProperty('endTime');
      expect(result.code).toBe('KD-ABC234');
    });

    it('propaga tal cual el mensaje de error del servidor', async () => {
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: null,
        error: { context: new Response(JSON.stringify({ error: 'Ya tienes una cita que se cruza con ese horario.' })) },
      } as never);

      await expect(createPublicAppointment(input)).rejects.toThrow('Ya tienes una cita que se cruza con ese horario.');
    });
  });
  describe('citas del paciente (patient-appointments)', () => {
    const serverRow = {
      id: 'a1',
      code: 'KD-ABC234',
      date: '2026-11-20',
      startTime: '09:00',
      endTime: '09:45',
      status: 'pending',
      branchId: 'b1',
      branchName: 'Sede Centro',
      professionalId: 'p1',
      professionalName: 'Ana Ríos',
      serviceId: 's1',
      serviceName: 'Endodoncia',
      serviceDuration: 45,
    };

    it('getPatientAppointments envía list con DNI y código y devuelve nombre y citas', async () => {
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: { patient: { firstName: 'Lucía', lastName: 'Paz' }, appointments: [serverRow] },
        error: null,
      } as never);

      const result = await getPatientAppointments('12345678', 'abc234');

      expect(supabase.functions.invoke).toHaveBeenCalledWith('patient-appointments', {
        body: { action: 'list', dni: '12345678', code: 'abc234' },
      });
      expect(result.patientName).toBe('Lucía Paz');
      expect(result.appointments).toEqual([serverRow]);
    });

    it('getPatientAppointments propaga "El DNI y el código no coinciden."', async () => {
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: null,
        error: { context: new Response(JSON.stringify({ error: 'El DNI y el código no coinciden.' }), { status: 404 }) },
      } as never);

      await expect(getPatientAppointments('12345678', 'ABC234')).rejects.toThrow('El DNI y el código no coinciden.');
    });

    it('cancelPatientAppointment envía cancel con la cita', async () => {
      vi.mocked(supabase.functions.invoke).mockResolvedValue({ data: { id: 'a1', status: 'cancelled' }, error: null } as never);

      await cancelPatientAppointment('12345678', 'KD-ABC234', 'a1');

      expect(supabase.functions.invoke).toHaveBeenCalledWith('patient-appointments', {
        body: { action: 'cancel', dni: '12345678', code: 'KD-ABC234', appointmentId: 'a1' },
      });
    });

    it('reschedulePatientAppointment envía fecha y hora y propaga el error del servidor', async () => {
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: null,
        error: { context: new Response(JSON.stringify({ error: 'Ese horario ya no está disponible. Elige otro.' })) },
      } as never);

      await expect(
        reschedulePatientAppointment('12345678', 'KD-ABC234', 'a1', { date: '2026-11-21', startTime: '10:00' }),
      ).rejects.toThrow('Ese horario ya no está disponible. Elige otro.');
      expect(supabase.functions.invoke).toHaveBeenCalledWith('patient-appointments', {
        body: { action: 'reschedule', dni: '12345678', code: 'KD-ABC234', appointmentId: 'a1', date: '2026-11-21', startTime: '10:00' },
      });
    });

    it('requestAppointmentCodes envía resend-code solo con el DNI y devuelve el mensaje', async () => {
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: { message: 'Si el DNI tiene citas registradas, te enviamos los códigos a tu correo.' },
        error: null,
      } as never);

      const message = await requestAppointmentCodes('12345678');

      expect(supabase.functions.invoke).toHaveBeenCalledWith('patient-appointments', {
        body: { action: 'resend-code', dni: '12345678' },
      });
      expect(message).toBe('Si el DNI tiene citas registradas, te enviamos los códigos a tu correo.');
    });

    it('un error sin cuerpo da un mensaje claro', async () => {
      vi.mocked(supabase.functions.invoke).mockResolvedValue({ data: null, error: new Error('Failed to fetch') } as never);

      await expect(getPatientAppointments('12345678', 'ABC234')).rejects.toThrow('No se pudieron consultar tus citas.');
    });
  });
});
