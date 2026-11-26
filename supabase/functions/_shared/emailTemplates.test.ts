import { describe, expect, it } from 'vitest';
import {
  appointmentCodesEmail,
  bookingEmail,
  cancelledEmail,
  reminderEmail,
  rescheduledEmail,
  type EmailAppointment,
} from './emailTemplates';

const appointment: EmailAppointment = {
  code: 'KD-ABC234',
  date: '2026-11-20',
  startTime: '09:00',
  branchName: 'Sede Centro',
  professionalName: 'Ana Ríos',
  serviceName: 'Endodoncia unirradicular',
};

describe('bookingEmail', () => {
  it('incluye código, fecha, hora, sede, profesional, servicio y el enlace a /consultar-citas', () => {
    const email = bookingEmail({ patientName: 'Lucía', appointment, siteUrl: 'https://kristelldent.pe/' });

    expect(email.subject).toContain('KD-ABC234');
    for (const text of ['KD-ABC234', 'viernes, 20 de noviembre de 2026', '09:00', 'Sede Centro', 'Ana Ríos', 'Endodoncia unirradicular']) {
      expect(email.html).toContain(text);
    }
    expect(email.html).toContain('href="https://kristelldent.pe/consultar-citas"');
  });

  it('sin SITE_URL indica la ruta en texto, sin enlace', () => {
    const email = bookingEmail({ patientName: 'Lucía', appointment, siteUrl: null });

    expect(email.html).not.toContain('href=');
    expect(email.html).toContain('Consultar citas');
  });

  it('escapa el HTML de los datos', () => {
    const email = bookingEmail({
      patientName: '<script>x</script>',
      appointment: { ...appointment, serviceName: 'A & B "C"' },
      siteUrl: null,
    });

    expect(email.html).not.toContain('<script>');
    expect(email.html).toContain('&lt;script&gt;');
    expect(email.html).toContain('A &amp; B &quot;C&quot;');
  });
});

describe('appointmentCodesEmail', () => {
  it('lista el código y los datos de cada cita', () => {
    const second = { ...appointment, code: 'KD-XYZ789', date: '2026-12-01', startTime: '15:30' };
    const email = appointmentCodesEmail({ patientName: 'Lucía', appointments: [appointment, second], siteUrl: 'https://kristelldent.pe' });

    expect(email.subject).toBe('Los códigos de tus citas en Kristell Dent');
    for (const text of ['KD-ABC234', 'KD-XYZ789', '15:30', 'Sede Centro', 'Ana Ríos']) {
      expect(email.html).toContain(text);
    }
    expect(email.html).toContain('href="https://kristelldent.pe/consultar-citas"');
  });
});

// HU13: reprogramar y cancelar también avisan con fecha, hora, sede, profesional y código.
describe('rescheduledEmail', () => {
  it('avisa la nueva fecha y hora con todos los datos de la cita', () => {
    const email = rescheduledEmail({ patientName: 'Lucía', appointment, siteUrl: 'https://kristelldent.pe' });

    expect(email.subject).toBe('Tu cita en Kristell Dent fue reprogramada — código KD-ABC234');
    expect(email.html).toContain('reprogramada');
    for (const text of ['KD-ABC234', 'viernes, 20 de noviembre de 2026', '09:00', 'Sede Centro', 'Ana Ríos']) {
      expect(email.html).toContain(text);
    }
    expect(email.html).toContain('href="https://kristelldent.pe/consultar-citas"');
  });
});

describe('cancelledEmail', () => {
  it('avisa la cancelación con los datos de la cita y cómo reservar otra', () => {
    const email = cancelledEmail({ patientName: 'Lucía', appointment, siteUrl: 'https://kristelldent.pe' });

    expect(email.subject).toBe('Tu cita en Kristell Dent fue cancelada — código KD-ABC234');
    expect(email.html).toContain('cancelada');
    for (const text of ['KD-ABC234', 'viernes, 20 de noviembre de 2026', '09:00', 'Sede Centro', 'Ana Ríos']) {
      expect(email.html).toContain(text);
    }
    expect(email.html).toContain('href="https://kristelldent.pe/reservar"');
    // Una cita cancelada ya no se reprograma: no se ofrece "Consultar citas" para eso.
    expect(email.html).not.toContain('reprogramarlas');
  });

  it('sin SITE_URL no pone enlaces', () => {
    const email = cancelledEmail({ patientName: 'Lucía', appointment, siteUrl: null });

    expect(email.html).not.toContain('href=');
  });
});

// HU14: recordatorio breve, con el código y cómo reprogramar o cancelar.
describe('reminderEmail', () => {
  it('recuerda la cita de mañana con el código y cómo reprogramarla o cancelarla', () => {
    const email = reminderEmail({ patientName: 'Lucía', appointment, siteUrl: 'https://kristelldent.pe' });

    expect(email.subject).toBe('Recordatorio: tu cita en Kristell Dent es mañana a las 09:00');
    for (const text of ['KD-ABC234', 'viernes, 20 de noviembre de 2026', '09:00', 'Sede Centro', 'Ana Ríos']) {
      expect(email.html).toContain(text);
    }
    expect(email.html).toContain('reprogramarla o cancelarla');
    expect(email.html).toContain('href="https://kristelldent.pe/consultar-citas"');
  });

  it('escapa el HTML de los datos', () => {
    const email = reminderEmail({ patientName: '<b>x</b>', appointment, siteUrl: null });

    expect(email.html).not.toContain('<b>x</b>');
  });
});
