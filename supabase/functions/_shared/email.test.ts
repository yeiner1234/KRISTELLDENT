import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { sendEmail } from './email';

const message = { to: 'lucia@correo.pe', subject: 'Tu cita', html: '<p>Hola</p>' };

function stubEnv(values: Record<string, string | undefined>) {
  vi.stubGlobal('Deno', { env: { get: (name: string) => values[name] } });
}

describe('sendEmail', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('sin RESEND_API_KEY o EMAIL_FROM avisa, no llama a Resend y devuelve false', async () => {
    stubEnv({ RESEND_API_KEY: 're_123' });

    await expect(sendEmail(message)).resolves.toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalled();
  });

  it('con los secretos envía a la API de Resend y devuelve true si responde 2xx', async () => {
    stubEnv({ RESEND_API_KEY: 're_123', EMAIL_FROM: 'Kristell Dent <citas@kristelldent.pe>' });
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ id: 'e1' }), { status: 200 }));

    await expect(sendEmail(message)).resolves.toBe(true);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.resend.com/emails');
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bearer re_123');
    expect(JSON.parse(init.body)).toEqual({
      from: 'Kristell Dent <citas@kristelldent.pe>',
      to: ['lucia@correo.pe'],
      subject: 'Tu cita',
      html: '<p>Hola</p>',
    });
  });

  it('un error HTTP de Resend devuelve false sin lanzar', async () => {
    stubEnv({ RESEND_API_KEY: 're_123', EMAIL_FROM: 'citas@kristelldent.pe' });
    fetchMock.mockResolvedValue(new Response('{"message":"invalid"}', { status: 422 }));

    await expect(sendEmail(message)).resolves.toBe(false);
  });

  it('un error de red devuelve false sin lanzar', async () => {
    stubEnv({ RESEND_API_KEY: 're_123', EMAIL_FROM: 'citas@kristelldent.pe' });
    fetchMock.mockRejectedValue(new TypeError('network'));

    await expect(sendEmail(message)).resolves.toBe(false);
  });

  it('sin destinatario no envía', async () => {
    stubEnv({ RESEND_API_KEY: 're_123', EMAIL_FROM: 'citas@kristelldent.pe' });

    await expect(sendEmail({ ...message, to: '' })).resolves.toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
