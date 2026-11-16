import { describe, expect, it } from 'vitest';
import { canPatientModify } from './patientAppointments';

describe('canPatientModify', () => {
  const today = '2026-11-15';

  it('permite pending y confirmed de hoy en adelante', () => {
    expect(canPatientModify({ status: 'pending', date: '2026-11-15' }, today)).toBe(true);
    expect(canPatientModify({ status: 'confirmed', date: '2026-12-01' }, today)).toBe(true);
  });

  it('no permite citas atendidas, en sala ni canceladas', () => {
    expect(canPatientModify({ status: 'completed', date: '2026-11-20' }, today)).toBe(false);
    expect(canPatientModify({ status: 'in_room', date: '2026-11-15' }, today)).toBe(false);
    expect(canPatientModify({ status: 'cancelled', date: '2026-11-20' }, today)).toBe(false);
  });

  it('no permite citas de fechas pasadas', () => {
    expect(canPatientModify({ status: 'pending', date: '2026-11-14' }, today)).toBe(false);
  });
});
