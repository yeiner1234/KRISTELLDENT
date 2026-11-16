// Envío de correos con la API HTTP de Resend (https://resend.com/docs/api-reference/emails/send-email).
// Secretos: RESEND_API_KEY y EMAIL_FROM (p. ej. "Kristell Dent <citas@tudominio.pe>").
//
// Un correo nunca debe romper la operación que lo dispara (reservar, pedir
// los códigos): si falta un secreto o Resend falla, se registra y se devuelve
// false. Sin imports de Deno para poder probarlo con Vitest (email.test.ts).

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
}

const RESEND_URL = 'https://api.resend.com/emails';
// La reserva debe confirmarse en menos de 3 s: no se espera más al correo.
const TIMEOUT_MS = 2500;

declare const Deno: { env: { get(name: string): string | undefined } };

export async function sendEmail({ to, subject, html }: EmailMessage): Promise<boolean> {
  const apiKey = Deno.env.get('RESEND_API_KEY');
  const from = Deno.env.get('EMAIL_FROM');

  if (!apiKey || !from) {
    console.warn('Correo no enviado: faltan los secretos RESEND_API_KEY o EMAIL_FROM.');
    return false;
  }
  if (!to.trim()) {
    return false;
  }

  try {
    const response = await fetch(RESEND_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [to.trim()], subject, html }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) {
      console.error(`Resend respondió ${response.status}: ${await response.text()}`);
      return false;
    }
    return true;
  } catch (error) {
    console.error('No se pudo enviar el correo:', error);
    return false;
  }
}
