import { describe, expect, it } from 'vitest';
import {
  accessLockState,
  canAccessAppointment,
  LOCKED_ERROR,
  MISMATCH_ERROR,
  RESEND_CODE_MESSAGE,
  modificationError,
  normalizeAppointmentCode,
  parseRequest,
  serviceSnapshot,
  triggerErrorMessage,
} from './patientAppointments';

const APPOINTMENT_ID = '3f0c1d2e-4b5a-4c6d-8e7f-9a0b1c2d3e4f';

describe('normalizeAppointmentCode', () => {
  it('acepta el código con o sin KD-, en minúsculas y con espacios', () => {
    expect(normalizeAppointmentCode('KD-ABC234')).toBe('KD-ABC234');
    expect(normalizeAppointmentCode('kd-abc234')).toBe('KD-ABC234');
    expect(normalizeAppointmentCode(' abc 234 ')).toBe('KD-ABC234');
    expect(normalizeAppointmentCode('KDABC234')).toBe('KD-ABC234');
    expect(normalizeAppointmentCode('kd - abc234')).toBe('KD-ABC234');
  });

  it('rechaza largos distintos y caracteres que el generador nunca usa', () => {
    expect(normalizeAppointmentCode('ABC23')).toBeNull();
    expect(normalizeAppointmentCode('ABC2345')).toBeNull();
    expect(normalizeAppointmentCode('ABCO10')).toBeNull();
    expect(normalizeAppointmentCode('AB-234')).toBeNull();
    expect(normalizeAppointmentCode(123456)).toBeNull();
    expect(normalizeAppointmentCode(undefined)).toBeNull();
  });
});

describe('parseRequest', () => {
  const base = { dni: '12345678', code: 'abc234' };

  it('list solo necesita DNI y código', () => {
    expect(parseRequest({ ...base, action: 'list' })).toEqual({
      ok: true,
      value: { action: 'list', dni: '12345678', code: 'KD-ABC234' },
    });
  });

  it('DNI o código mal formados responden 404 con el mensaje único', () => {
    for (const payload of [
      { action: 'list', dni: '1234567', code: 'ABC234' },
      { action: 'list', dni: '12345678', code: 'XYZ' },
      { action: 'cancel', code: 'ABC234', appointmentId: APPOINTMENT_ID },
    ]) {
      expect(parseRequest(payload)).toEqual({ ok: false, status: 404, error: MISMATCH_ERROR });
    }
    expect(MISMATCH_ERROR).toBe('El DNI y el código no coinciden.');
  });

  it('acción desconocida → 400', () => {
    expect(parseRequest({ ...base, action: 'delete' })).toMatchObject({ ok: false, status: 400 });
    expect(parseRequest({ ...base })).toMatchObject({ ok: false, status: 400 });
  });

  it('cancel exige un appointmentId UUID', () => {
    expect(parseRequest({ ...base, action: 'cancel' })).toMatchObject({ ok: false, status: 400 });
    expect(parseRequest({ ...base, action: 'cancel', appointmentId: 'abc' })).toMatchObject({ ok: false, status: 400 });
    expect(parseRequest({ ...base, action: 'cancel', appointmentId: APPOINTMENT_ID })).toEqual({
      ok: true,
      value: { action: 'cancel', dni: '12345678', code: 'KD-ABC234', appointmentId: APPOINTMENT_ID },
    });
  });

  it('resend-code solo necesita el DNI y valida su formato', () => {
    expect(parseRequest({ action: 'resend-code', dni: ' 12345678 ' })).toEqual({
      ok: true,
      value: { action: 'resend-code', dni: '12345678' },
    });
    expect(parseRequest({ action: 'resend-code', dni: '1234' })).toEqual({
      ok: false,
      status: 400,
      error: 'El DNI debe tener 8 dígitos.',
    });
    expect(RESEND_CODE_MESSAGE).toBe('Si el DNI tiene citas registradas, te enviamos los códigos a tu correo.');
  });

  it('reschedule exige fecha real y hora válida', () => {
    const reschedule = { ...base, action: 'reschedule', appointmentId: APPOINTMENT_ID };
    expect(parseRequest({ ...reschedule, date: '2026-02-30', startTime: '09:00' })).toMatchObject({ ok: false, status: 400 });
    expect(parseRequest({ ...reschedule, date: '2026-11-20', startTime: '25:00' })).toMatchObject({ ok: false, status: 400 });
    expect(parseRequest({ ...reschedule, date: '2026-11-20' })).toMatchObject({ ok: false, status: 400 });
    expect(parseRequest({ ...reschedule, date: '2026-11-20', startTime: '09:00:00' })).toEqual({
      ok: true,
      value: {
        action: 'reschedule',
        dni: '12345678',
        code: 'KD-ABC234',
        appointmentId: APPOINTMENT_ID,
        date: '2026-11-20',
        startTime: '09:00',
      },
    });
  });
});

describe('modificationError', () => {
  const today = { date: '2026-11-15', time: '08:00' };

  it('permite pending y confirmed que todavía no empiezan', () => {
    expect(modificationError({ status: 'pending', appointment_date: '2026-11-15', start_time: '09:00:00' }, today)).toBeNull();
    expect(modificationError({ status: 'confirmed', appointment_date: '2026-12-01', start_time: '07:00:00' }, today)).toBeNull();
  });

  it('rechaza una cita de hoy cuya hora ya pasó', () => {
    expect(
      modificationError({ status: 'pending', appointment_date: '2026-11-15', start_time: '08:00:00' }, today),
    ).toBe('La hora de la cita ya pasó: no se puede modificar.');
  });

  it('rechaza citas ya atendidas, en sala o canceladas', () => {
    expect(modificationError({ status: 'completed', appointment_date: '2026-11-20', start_time: '09:00' }, today)).toBe(
      'La cita ya fue atendida: no se puede modificar.',
    );
    expect(modificationError({ status: 'in_room', appointment_date: '2026-11-15', start_time: '09:00' }, today)).toBe(
      'La cita ya está en atención: no se puede modificar.',
    );
    expect(modificationError({ status: 'cancelled', appointment_date: '2026-11-20', start_time: '09:00' }, today)).toBe(
      'La cita ya está cancelada: no se puede modificar.',
    );
  });

  it('rechaza citas de una fecha pasada', () => {
    expect(modificationError({ status: 'pending', appointment_date: '2026-11-14', start_time: '09:00' }, today)).toBe(
      'La cita es de una fecha pasada: no se puede modificar.',
    );
  });
});

describe('triggerErrorMessage', () => {
  it('devuelve el mensaje de un P0001 y null para otros errores', () => {
    expect(triggerErrorMessage({ code: 'P0001', message: 'La cita ya está completada: no se puede modificar.' })).toBe(
      'La cita ya está completada: no se puede modificar.',
    );
    expect(triggerErrorMessage({ code: '23P01', message: 'conflicting key' })).toBeNull();
  });
});

describe('canAccessAppointment', () => {
  it('un código completo da acceso a todas las citas del paciente', () => {
    expect(canAccessAppointment({ limitedToAppointmentId: null }, 'a2')).toBe(true);
  });

  it('un código limitado solo da acceso a su propia cita', () => {
    expect(canAccessAppointment({ limitedToAppointmentId: 'a1' }, 'a1')).toBe(true);
    expect(canAccessAppointment({ limitedToAppointmentId: 'a1' }, 'a2')).toBe(false);
  });
});

describe('serviceSnapshot', () => {
  it('usa la copia guardada en la cita aunque el servicio haya cambiado después', () => {
    const row = { service_id: 's1', service_name: 'Limpieza', service_duration_minutes: 30 };
    const current = new Map([['s1', { name: 'Limpieza profunda', duration_minutes: 45 }]]);

    expect(serviceSnapshot(row, current)).toEqual({ serviceName: 'Limpieza', serviceDuration: 30 });
  });

  it('cita vieja sin copia: toma el servicio actual', () => {
    const row = { service_id: 's1', service_name: null, service_duration_minutes: null };
    const current = new Map([['s1', { name: 'Limpieza', duration_minutes: 40 }]]);

    expect(serviceSnapshot(row, current)).toEqual({ serviceName: 'Limpieza', serviceDuration: 40 });
  });

  it('cita sin servicio', () => {
    const row = { service_id: null, service_name: null, service_duration_minutes: null };

    expect(serviceSnapshot(row, new Map())).toEqual({ serviceName: null, serviceDuration: null });
  });
});

// HU15 caso límite 1: 3 códigos incorrectos bloquean la consulta 5 minutos.
describe('accessLockState', () => {
  const at = (time: string) => `2026-11-25T${time}Z`;
  const now = (time: string) => new Date(at(time));

  it('sin fallos o con menos de 3 no bloquea', () => {
    expect(accessLockState([], now('10:00:00')).locked).toBe(false);
    expect(accessLockState([at('09:58:00'), at('09:59:00')], now('10:00:00')).locked).toBe(false);
  });

  it('el 3.º fallo bloquea 5 minutos contados desde ese fallo', () => {
    const failures = [at('10:00:00'), at('10:01:00'), at('10:02:00')];

    expect(accessLockState(failures, now('10:02:00'))).toEqual({ locked: true, retryAfterSeconds: 300 });
    expect(accessLockState(failures, now('10:06:30'))).toEqual({ locked: true, retryAfterSeconds: 30 });
    expect(accessLockState(failures, now('10:07:00')).locked).toBe(false);
  });

  it('los fallos se cuentan dentro de 15 minutos: tres muy separados no bloquean', () => {
    const failures = [at('09:00:00'), at('09:20:00'), at('09:40:00')];

    expect(accessLockState(failures, now('09:40:00')).locked).toBe(false);
  });

  it('tras cumplir el bloqueo, la cuenta empieza de cero', () => {
    const failures = [at('10:00:00'), at('10:01:00'), at('10:02:00'), at('10:08:00')];

    expect(accessLockState(failures, now('10:08:00')).locked).toBe(false);
  });

  it('el orden de llegada de los fallos no importa', () => {
    const failures = [at('10:02:00'), at('10:00:00'), at('10:01:00')];

    expect(accessLockState(failures, now('10:03:00')).locked).toBe(true);
  });

  it('el mensaje de bloqueo no revela si el DNI existe', () => {
    expect(LOCKED_ERROR).not.toMatch(/registrad|existe/i);
    expect(LOCKED_ERROR).toContain('5 minutos');
  });
});
