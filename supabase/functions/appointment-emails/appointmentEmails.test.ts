import { describe, expect, it } from 'vitest';
import {
  isAuthorized,
  isReminderDue,
  limaStartInstant,
  notificationEmail,
  notificationRecipient,
  type ReminderCandidate,
} from './appointmentEmails';
import type { EmailAppointment } from '../_shared/emailTemplates';

describe('limaStartInstant', () => {
  it('interpreta fecha y hora en Lima (UTC-5, sin horario de verano)', () => {
    expect(new Date(limaStartInstant('2026-11-20', '10:00')).toISOString()).toBe('2026-11-20T15:00:00.000Z');
    expect(new Date(limaStartInstant('2026-11-20', '10:00:00')).toISOString()).toBe('2026-11-20T15:00:00.000Z');
  });
});

// Cita del 20/11 a las 10:00 de Lima (15:00 UTC), reservada con días de anticipación.
const candidate: ReminderCandidate = {
  status: 'confirmed',
  appointment_date: '2026-11-20',
  start_time: '10:00:00',
  scheduled_at: '2026-11-10T12:00:00Z',
  reminder_sent_at: null,
};

describe('isReminderDue (HU14)', () => {
  it('a las 10:00 del 19/11 ya toca enviar el recordatorio (24 horas antes)', () => {
    expect(isReminderDue(candidate, new Date('2026-11-19T15:00:00Z'))).toBe(true);
  });

  it('un minuto antes de las 24 horas todavía no', () => {
    expect(isReminderDue(candidate, new Date('2026-11-19T14:59:00Z'))).toBe(false);
  });

  it('si el envío se atrasó, sale igual mientras la cita no haya empezado', () => {
    expect(isReminderDue(candidate, new Date('2026-11-20T14:00:00Z'))).toBe(true);
    expect(isReminderDue(candidate, new Date('2026-11-20T15:00:00Z'))).toBe(false);
  });

  it('las citas pendientes también se recuerdan', () => {
    expect(isReminderDue({ ...candidate, status: 'pending' }, new Date('2026-11-19T15:00:00Z'))).toBe(true);
  });

  it('caso límite 1: nunca una cita cancelada (ni atendida o en sala)', () => {
    for (const status of ['cancelled', 'completed', 'in_room']) {
      expect(isReminderDue({ ...candidate, status }, new Date('2026-11-19T15:00:00Z'))).toBe(false);
    }
  });

  it('caso límite 2: no si se reservó o reprogramó con menos de 24 horas de anticipación', () => {
    // Reservada el 19/11 a las 11:00 de Lima para el 20/11 a las 10:00: 23 horas antes.
    const late = { ...candidate, scheduled_at: '2026-11-19T16:00:00Z' };
    expect(isReminderDue(late, new Date('2026-11-19T16:05:00Z'))).toBe(false);
  });

  it('justo 24 horas de anticipación sí cuenta', () => {
    const exact = { ...candidate, scheduled_at: '2026-11-19T15:00:00Z' };
    expect(isReminderDue(exact, new Date('2026-11-19T15:00:00Z'))).toBe(true);
  });

  it('no se envía dos veces', () => {
    expect(isReminderDue({ ...candidate, reminder_sent_at: '2026-11-19T15:00:00Z' }, new Date('2026-11-19T15:10:00Z'))).toBe(false);
  });
});

describe('isAuthorized', () => {
  it('acepta solo el secreto exacto', () => {
    expect(isAuthorized('s3creto-largo', 's3creto-largo')).toBe(true);
    expect(isAuthorized('otro', 's3creto-largo')).toBe(false);
    expect(isAuthorized(null, 's3creto-largo')).toBe(false);
  });

  it('sin secreto configurado rechaza todo (también un encabezado vacío)', () => {
    expect(isAuthorized('', undefined)).toBe(false);
    expect(isAuthorized('', '')).toBe(false);
  });
});

const appointment: EmailAppointment = {
  code: 'KD-ABC234',
  date: '2026-11-20',
  startTime: '10:00',
  branchName: 'Sede Centro',
  professionalName: 'Ana Ríos',
  serviceName: null,
};

describe('notificationEmail', () => {
  it('elige la plantilla según el tipo de aviso', () => {
    const input = { patientName: 'Lucía', appointment, siteUrl: null };
    expect(notificationEmail('rescheduled', input).subject).toContain('reprogramada');
    expect(notificationEmail('cancelled', input).subject).toContain('cancelada');
  });
});

// Avisos y recordatorios van al correo con que se reservó esa cita.
describe('notificationRecipient', () => {
  it('prefiere el correo de contacto de la cita', () => {
    expect(notificationRecipient(' reserva@correo.pe ', 'registrado@correo.pe')).toBe('reserva@correo.pe');
  });

  it('citas antiguas sin correo de contacto: el registrado del paciente', () => {
    expect(notificationRecipient(null, 'registrado@correo.pe')).toBe('registrado@correo.pe');
    expect(notificationRecipient('  ', 'registrado@correo.pe')).toBe('registrado@correo.pe');
  });

  it('sin ningún correo, null', () => {
    expect(notificationRecipient(null, null)).toBeNull();
  });
});
