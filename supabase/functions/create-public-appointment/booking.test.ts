import { describe, expect, it } from 'vitest';
import {
  addMinutes,
  limaToday,
  bookingMatchesPatient,
  limaNow,
  missingPatientFields,
  overlapErrorMessage,
  validateBookingPayload,
} from './booking.ts';

const valid = {
  dni: ' 12345678 ',
  firstName: ' Ana ',
  lastName: ' Ríos ',
  email: ' ana@correo.pe ',
  phone: ' 987654321 ',
  professionalId: '11111111-1111-4111-8111-111111111111',
  branchId: '22222222-2222-4222-8222-222222222222',
  serviceId: '33333333-3333-4333-8333-333333333333',
  date: '2026-11-20',
  startTime: '09:30',
  endTime: '23:59',
  reason: ' Dolor ',
};

describe('validateBookingPayload', () => {
  it('acepta un payload válido, recorta espacios e ignora endTime', () => {
    const result = validateBookingPayload(valid, '2026-11-15');
    expect(result).toEqual({
      ok: true,
      value: {
        dni: '12345678',
        firstName: 'Ana',
        lastName: 'Ríos',
        email: 'ana@correo.pe',
        phone: '987654321',
        professionalId: '11111111-1111-4111-8111-111111111111',
        branchId: '22222222-2222-4222-8222-222222222222',
        serviceId: '33333333-3333-4333-8333-333333333333',
        date: '2026-11-20',
        startTime: '09:30',
        reason: 'Dolor',
      },
    });
  });

  it.each(['dni', 'firstName', 'lastName', 'email', 'phone', 'professionalId', 'branchId', 'serviceId', 'date', 'startTime'])(
    'rechaza si falta %s',
    (field) => {
      const result = validateBookingPayload({ ...valid, [field]: '  ' }, '2026-11-15');
      expect(result.ok).toBe(false);
    },
  );

  it('un campo que no es texto cuenta como faltante', () => {
    const result = validateBookingPayload({ ...valid, dni: 12345678 as unknown as string }, '2026-11-15');
    expect(result).toEqual({ ok: false, error: 'Faltan datos obligatorios para reservar la cita.' });
  });

  it('rechaza un DNI que no tiene 8 dígitos', () => {
    expect(validateBookingPayload({ ...valid, dni: '1234567' }, '2026-11-15')).toEqual({
      ok: false,
      error: 'El DNI debe tener 8 dígitos.',
    });
  });

  it('rechaza nombres o apellidos de una sola letra', () => {
    expect(validateBookingPayload({ ...valid, firstName: 'A' }, '2026-11-15')).toEqual({
      ok: false,
      error: 'Los nombres y apellidos deben tener al menos 2 caracteres.',
    });
    expect(validateBookingPayload({ ...valid, lastName: 'R' }, '2026-11-15').ok).toBe(false);
  });

  it('rechaza un correo sin formato válido', () => {
    expect(validateBookingPayload({ ...valid, email: 'ana-correo.pe' }, '2026-11-15')).toEqual({
      ok: false,
      error: 'El correo no tiene un formato válido.',
    });
  });

  it('rechaza un teléfono que no tiene 9 dígitos', () => {
    expect(validateBookingPayload({ ...valid, phone: '98765432' }, '2026-11-15')).toEqual({
      ok: false,
      error: 'El teléfono debe tener 9 dígitos.',
    });
  });

  it('rechaza una fecha anterior a hoy en Lima y acepta hoy', () => {
    expect(validateBookingPayload({ ...valid, date: '2026-11-14' }, '2026-11-15')).toEqual({
      ok: false,
      error: 'No se puede reservar una fecha pasada.',
    });
    expect(validateBookingPayload({ ...valid, date: '2026-11-15' }, '2026-11-15').ok).toBe(true);
  });

  it('rechaza una fecha u hora imposible', () => {
    const error = { ok: false, error: 'La fecha u hora de la cita no es válida.' };
    expect(validateBookingPayload({ ...valid, date: '2026-13-45' }, '2026-11-15')).toEqual(error);
    expect(validateBookingPayload({ ...valid, date: '2026-02-30' }, '2026-11-15')).toEqual(error);
    expect(validateBookingPayload({ ...valid, startTime: '25:00' }, '2026-11-15')).toEqual(error);
  });

  it('rechaza identificadores que no son UUID', () => {
    expect(validateBookingPayload({ ...valid, serviceId: 'service-1' }, '2026-11-15')).toEqual({
      ok: false,
      error: 'La sede, profesional o servicio elegido no es válido.',
    });
  });

  it('el motivo es opcional', () => {
    const result = validateBookingPayload({ ...valid, reason: undefined }, '2026-11-15');
    expect(result.ok && result.value.reason).toBeNull();
  });
});

describe('limaToday', () => {
  it('a las 21:00 de Lima (02:00 UTC del día siguiente) sigue siendo hoy', () => {
    expect(limaToday(new Date('2026-11-16T02:00:00Z'))).toBe('2026-11-15');
  });
});

describe('addMinutes', () => {
  it('suma la duración a la hora de inicio', () => {
    expect(addMinutes('09:30', 45)).toBe('10:15');
    expect(addMinutes('09:30:00', 30)).toBe('10:00');
  });
});

describe('missingPatientFields', () => {
  const incoming = { firstName: 'Ana', lastName: 'Ríos', email: 'nuevo@correo.pe', phone: '911111111' };

  it('no sobrescribe datos que el paciente ya tiene', () => {
    const existing = { first_name: 'Anita', last_name: 'Rios', email: 'viejo@correo.pe', phone: '999999999' };
    expect(missingPatientFields(existing, incoming)).toEqual({});
  });

  it('completa solo los campos vacíos, nunca el correo', () => {
    // El correo recibe los códigos (resend-code): quien solo sabe un DNI no
    // puede registrar el suyo en el paciente de otra persona.
    const existing = { first_name: 'Anita', last_name: 'Rios', email: null, phone: '  ' };
    expect(missingPatientFields(existing, incoming)).toEqual({ phone: '911111111' });
  });
});

describe('limaNow', () => {
  it('da fecha y hora de Lima aunque en UTC ya sea mañana', () => {
    expect(limaNow(new Date('2026-11-16T02:05:00Z'))).toEqual({ date: '2026-11-15', time: '21:05' });
  });
});

describe('bookingMatchesPatient', () => {
  const existing = { first_name: 'Ana María', last_name: 'Ríos Paz', email: 'Ana@Correo.pe', phone: '987654321' };

  it('coincide si nombres, apellidos y correo son los registrados (sin importar mayúsculas, tildes ni espacios)', () => {
    expect(
      bookingMatchesPatient(existing, { firstName: ' ana  maria ', lastName: 'RIOS PAZ', email: 'ana@correo.pe' }),
    ).toBe(true);
  });

  it('no coincide si cambia el correo, el nombre o el apellido', () => {
    expect(bookingMatchesPatient(existing, { firstName: 'Ana María', lastName: 'Ríos Paz', email: 'otro@correo.pe' })).toBe(false);
    expect(bookingMatchesPatient(existing, { firstName: 'Juan', lastName: 'Ríos Paz', email: 'ana@correo.pe' })).toBe(false);
    expect(bookingMatchesPatient(existing, { firstName: 'Ana María', lastName: 'Pérez', email: 'ana@correo.pe' })).toBe(false);
  });

  it('no coincide si el paciente no tiene correo registrado', () => {
    expect(
      bookingMatchesPatient({ ...existing, email: null }, { firstName: 'Ana María', lastName: 'Ríos Paz', email: 'ana@correo.pe' }),
    ).toBe(false);
  });
});

describe('overlapErrorMessage', () => {
  it('traduce el choque de horario de la doctora', () => {
    expect(
      overlapErrorMessage({
        code: '23P01',
        message: 'conflicting key value violates exclusion constraint "appointments_no_overlap"',
      }),
    ).toBe('Ese horario ya no está disponible. Elige otro.');
  });

  it('traduce el choque con otra cita del mismo paciente', () => {
    expect(
      overlapErrorMessage({
        code: '23P01',
        message: 'conflicting key value violates exclusion constraint "appointments_no_patient_overlap"',
      }),
    ).toBe('Ya tienes una cita que se cruza con ese horario.');
  });

  it('devuelve null para otros errores', () => {
    expect(overlapErrorMessage({ code: '23505', message: 'duplicate key' })).toBeNull();
  });
});
