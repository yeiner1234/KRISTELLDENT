import { describe, expect, it } from 'vitest';
import { canPatientModify } from './patientAppointments';

describe('canPatientModify', () => {
  const today = { date: '2026-11-15', time: '08:00' };

  it('permite pending y confirmed que todavía no empiezan', () => {
    expect(canPatientModify({ status: 'pending', date: '2026-11-15', startTime: '09:00' }, today)).toBe(true);
    expect(canPatientModify({ status: 'confirmed', date: '2026-12-01', startTime: '07:00' }, today)).toBe(true);
  });

  it('no permite citas atendidas, en sala ni canceladas', () => {
    expect(canPatientModify({ status: 'completed', date: '2026-11-20', startTime: '09:00' }, today)).toBe(false);
    expect(canPatientModify({ status: 'in_room', date: '2026-11-15', startTime: '09:00' }, today)).toBe(false);
    expect(canPatientModify({ status: 'cancelled', date: '2026-11-20', startTime: '09:00' }, today)).toBe(false);
  });

  it('no permite citas de fechas pasadas', () => {
    expect(canPatientModify({ status: 'pending', date: '2026-11-14', startTime: '09:00' }, today)).toBe(false);
  });

  it('no permite una cita de hoy cuya hora ya pasó', () => {
    expect(canPatientModify({ status: 'pending', date: '2026-11-15', startTime: '08:00' }, today)).toBe(false);
  });
});
