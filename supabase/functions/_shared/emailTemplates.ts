// Plantillas de los correos al paciente. Lógica pura (probada con Vitest en
// emailTemplates.test.ts). Todo dato que viene de la base se escapa.

export interface EmailAppointment {
  code: string;
  date: string;
  startTime: string;
  branchName: string | null;
  professionalName: string | null;
  serviceName: string | null;
}

interface EmailContent {
  subject: string;
  html: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// La fecha es de calendario (sin hora): se formatea en UTC para que no corra el día.
const dateFormatter = new Intl.DateTimeFormat('es-PE', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

function formatDate(isoDate: string): string {
  return dateFormatter.format(new Date(`${isoDate}T00:00:00Z`));
}

function appointmentBlock(appointment: EmailAppointment): string {
  const rows: [string, string][] = [
    ['Fecha', formatDate(appointment.date)],
    ['Hora', appointment.startTime.slice(0, 5)],
    ['Sede', appointment.branchName ?? '—'],
    ['Profesional', appointment.professionalName ?? '—'],
    ['Servicio', appointment.serviceName ?? '—'],
  ];
  return `
    <div style="border:1px solid #e1e8ec;border-radius:12px;padding:16px;margin:16px 0;">
      <p style="margin:0 0 8px;font-size:12px;color:#5b6b73;text-transform:uppercase;letter-spacing:.06em;">Código de la cita</p>
      <p style="margin:0 0 12px;font-family:monospace;font-size:24px;font-weight:bold;letter-spacing:.12em;color:#12232b;">${escapeHtml(appointment.code)}</p>
      <table style="border-collapse:collapse;font-size:14px;color:#12232b;">
        ${rows
          .map(
            ([label, value]) =>
              `<tr><td style="padding:2px 12px 2px 0;color:#5b6b73;">${label}</td><td style="padding:2px 0;">${escapeHtml(value)}</td></tr>`,
          )
          .join('')}
      </table>
    </div>`;
}

// El enlace sale del secreto SITE_URL, nunca de la petición: un Origin
// falsificado convertiría el correo de la clínica en phishing.
function consultLink(siteUrl: string | null): string {
  if (!siteUrl) {
    return '<p style="font-size:14px;color:#12232b;">Para verlas, reprogramarlas o cancelarlas entra a nuestra web, sección <strong>Consultar citas</strong>, con tu DNI y el código.</p>';
  }
  const url = `${siteUrl.replace(/\/+$/, '')}/consultar-citas`;
  return `<p style="font-size:14px;color:#12232b;">Para verlas, reprogramarlas o cancelarlas entra a <a href="${escapeHtml(url)}" style="color:#0f7b86;">Consultar citas</a> con tu DNI y el código.</p>`;
}

function layout(patientName: string, intro: string, body: string): string {
  return `<!doctype html>
<html lang="es"><body style="margin:0;padding:24px;background:#f5fafb;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;padding:24px;">
    <p style="margin:0 0 4px;font-weight:bold;color:#0f7b86;">Kristell Dent</p>
    <p style="font-size:15px;color:#12232b;">Hola, ${escapeHtml(patientName)}:</p>
    <p style="font-size:14px;color:#12232b;">${intro}</p>
    ${body}
    <p style="font-size:12px;color:#5b6b73;margin-top:24px;">Guarda este correo: el código funciona como contraseña de tu cita. Si no reconoces esta cita, ignora este mensaje.</p>
  </div>
</body></html>`;
}

export function bookingEmail(input: {
  patientName: string;
  appointment: EmailAppointment;
  siteUrl: string | null;
}): EmailContent {
  return {
    subject: `Tu cita en Kristell Dent — código ${input.appointment.code}`,
    html: layout(
      input.patientName,
      'Tu cita quedó registrada. Estos son sus datos:',
      appointmentBlock(input.appointment) + consultLink(input.siteUrl),
    ),
  };
}

export function appointmentCodesEmail(input: {
  patientName: string;
  appointments: EmailAppointment[];
  siteUrl: string | null;
}): EmailContent {
  return {
    subject: 'Los códigos de tus citas en Kristell Dent',
    html: layout(
      input.patientName,
      'Pediste los códigos de tus próximas citas. Aquí están:',
      input.appointments.map(appointmentBlock).join('') + consultLink(input.siteUrl),
    ),
  };
}

function siteLink(siteUrl: string, path: string, label: string): string {
  const url = `${siteUrl.replace(/\/+$/, '')}${path}`;
  return `<a href="${escapeHtml(url)}" style="color:#0f7b86;">${label}</a>`;
}

// HU13: la cita cambió de fecha u hora (la cambió el paciente o la clínica).
export function rescheduledEmail(input: {
  patientName: string;
  appointment: EmailAppointment;
  siteUrl: string | null;
}): EmailContent {
  return {
    subject: `Tu cita en Kristell Dent fue reprogramada — código ${input.appointment.code}`,
    html: layout(
      input.patientName,
      'Tu cita fue reprogramada. Estos son sus nuevos datos:',
      appointmentBlock(input.appointment) + consultLink(input.siteUrl),
    ),
  };
}

// HU13: una cita cancelada ya no se puede reprogramar; se ofrece reservar otra.
export function cancelledEmail(input: {
  patientName: string;
  appointment: EmailAppointment;
  siteUrl: string | null;
}): EmailContent {
  const newBooking = input.siteUrl
    ? `<p style="font-size:14px;color:#12232b;">Si lo necesitas, puedes ${siteLink(input.siteUrl, '/reservar', 'reservar una nueva cita')}.</p>`
    : '<p style="font-size:14px;color:#12232b;">Si lo necesitas, puedes reservar una nueva cita en nuestra web.</p>';
  return {
    subject: `Tu cita en Kristell Dent fue cancelada — código ${input.appointment.code}`,
    html: layout(input.patientName, 'Tu cita fue cancelada. Estos eran sus datos:', appointmentBlock(input.appointment) + newBooking),
  };
}

// HU14: recordatorio breve un día antes, con cómo reprogramar o cancelar.
export function reminderEmail(input: {
  patientName: string;
  appointment: EmailAppointment;
  siteUrl: string | null;
}): EmailContent {
  const howTo = input.siteUrl
    ? `<p style="font-size:14px;color:#12232b;">Si no puedes asistir, entra a ${siteLink(input.siteUrl, '/consultar-citas', 'Consultar citas')} con tu DNI y el código para reprogramarla o cancelarla.</p>`
    : '<p style="font-size:14px;color:#12232b;">Si no puedes asistir, entra a nuestra web, sección <strong>Consultar citas</strong>, con tu DNI y el código para reprogramarla o cancelarla.</p>';
  return {
    subject: `Recordatorio: tu cita en Kristell Dent es mañana a las ${input.appointment.startTime.slice(0, 5)}`,
    html: layout(input.patientName, 'Te recordamos tu cita de mañana:', appointmentBlock(input.appointment) + howTo),
  };
}
