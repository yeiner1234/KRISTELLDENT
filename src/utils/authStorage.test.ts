import { beforeEach, describe, expect, it } from 'vitest';
import { REMEMBER_ME_KEY, authStorage, getRememberMe, setRememberMe } from './authStorage';

const TOKEN_KEY = 'sb-proyecto-auth-token';
const VERIFIER_KEY = 'sb-proyecto-auth-token-code-verifier';

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

describe('preferencia Recordarme', () => {
  it('por defecto recuerda la sesión', () => {
    expect(getRememberMe()).toBe(true);
  });

  it('guarda la elección', () => {
    setRememberMe(false);
    expect(localStorage.getItem(REMEMBER_ME_KEY)).toBe('false');
    expect(getRememberMe()).toBe(false);

    setRememberMe(true);
    expect(getRememberMe()).toBe(true);
  });
});

describe('authStorage', () => {
  it('con Recordarme guarda la sesión en localStorage', () => {
    setRememberMe(true);
    authStorage.setItem(TOKEN_KEY, 'sesion');

    expect(localStorage.getItem(TOKEN_KEY)).toBe('sesion');
    expect(sessionStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(authStorage.getItem(TOKEN_KEY)).toBe('sesion');
  });

  it('sin Recordarme guarda la sesión solo en sessionStorage y borra la copia persistente', () => {
    localStorage.setItem(TOKEN_KEY, 'vieja');
    setRememberMe(false);
    authStorage.setItem(TOKEN_KEY, 'sesion');

    expect(sessionStorage.getItem(TOKEN_KEY)).toBe('sesion');
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(authStorage.getItem(TOKEN_KEY)).toBe('sesion');
  });

  it('lee la sesión aunque esté en el otro almacenamiento', () => {
    localStorage.setItem(TOKEN_KEY, 'persistente');
    setRememberMe(false);

    expect(authStorage.getItem(TOKEN_KEY)).toBe('persistente');
  });

  it('el code-verifier de la recuperación siempre va a localStorage', () => {
    setRememberMe(false);
    authStorage.setItem(VERIFIER_KEY, 'verificador');

    expect(localStorage.getItem(VERIFIER_KEY)).toBe('verificador');
    expect(sessionStorage.getItem(VERIFIER_KEY)).toBeNull();
  });

  it('removeItem borra de los dos almacenamientos', () => {
    localStorage.setItem(TOKEN_KEY, 'a');
    sessionStorage.setItem(TOKEN_KEY, 'b');

    authStorage.removeItem(TOKEN_KEY);

    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(sessionStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(authStorage.getItem(TOKEN_KEY)).toBeNull();
  });
});
