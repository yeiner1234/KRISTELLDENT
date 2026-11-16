import { describe, expect, it } from 'vitest';
import { ACTION_TARGET_STATUS, getAppointmentActions } from './appointmentActions';

describe('getAppointmentActions', () => {
  it('admin: muestra solo las transiciones que permite el trigger', () => {
    expect(getAppointmentActions('pending', 'admin_sede')).toEqual(['confirm', 'arrive', 'reschedule', 'cancel']);
    expect(getAppointmentActions('confirmed', 'admin_global')).toEqual(['arrive', 'reschedule', 'cancel']);
    expect(getAppointmentActions('in_room', 'admin_sede')).toEqual(['complete', 'cancel']);
    expect(getAppointmentActions('completed', 'admin_sede')).toEqual([]);
    expect(getAppointmentActions('cancelled', 'admin_global')).toEqual([]);
  });

  it('profesional: confirma, marca como atendida y cancela, sin reprogramar ni marcar llegada', () => {
    expect(getAppointmentActions('pending', 'especialista')).toEqual(['confirm', 'cancel']);
    expect(getAppointmentActions('confirmed', 'odontologa_general')).toEqual(['cancel']);
    expect(getAppointmentActions('in_room', 'especialista')).toEqual(['complete', 'cancel']);
  });

  it('técnica: solo marca la llegada de citas pendientes o confirmadas', () => {
    expect(getAppointmentActions('pending', 'tecnica')).toEqual(['arrive']);
    expect(getAppointmentActions('confirmed', 'tecnica')).toEqual(['arrive']);
    expect(getAppointmentActions('in_room', 'tecnica')).toEqual([]);
    expect(getAppointmentActions('cancelled', 'tecnica')).toEqual([]);
  });

  it('cada acción de estado apunta al estado destino', () => {
    expect(ACTION_TARGET_STATUS).toEqual({
      confirm: 'confirmed',
      arrive: 'in_room',
      complete: 'completed',
      cancel: 'cancelled',
    });
  });
});
