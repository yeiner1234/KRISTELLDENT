import { describe, expect, it } from 'vitest';
import { passwordFlowFromHash } from './passwordLink';

describe('passwordFlowFromHash', () => {
  it('reconoce el enlace de recuperar contraseña', () => {
    expect(passwordFlowFromHash('#access_token=abc&expires_in=3600&type=recovery')).toBe('recovery');
  });

  it('reconoce el enlace de invitación del personal', () => {
    expect(passwordFlowFromHash('#access_token=abc&refresh_token=x&type=invite')).toBe('invite');
    expect(passwordFlowFromHash('#type=invite&access_token=abc')).toBe('invite');
  });

  it('un enlace vencido o sin tipo no es un enlace de contraseña', () => {
    expect(passwordFlowFromHash('#error=access_denied&error_code=otp_expired')).toBeNull();
    expect(passwordFlowFromHash('')).toBeNull();
    expect(passwordFlowFromHash('#type=signup')).toBeNull();
  });
});
