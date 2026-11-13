import { describe, expect, it } from 'vitest';
import { isValidDni, isValidEmail, isValidPhone } from './validation';

describe('validation', () => {
  it('acepta un DNI de 8 dígitos y rechaza uno de 7 o con letra', () => {
    expect(isValidDni('12345678')).toBe(true);
    expect(isValidDni('1234567')).toBe(false);
    expect(isValidDni('1234567A')).toBe(false);
  });

  it('acepta un correo válido y rechaza uno inválido', () => {
    expect(isValidEmail('paciente@kristelldent.pe')).toBe(true);
    expect(isValidEmail('paciente@kristelldent')).toBe(false);
  });

  it('acepta un teléfono de 9 dígitos y rechaza uno de 8', () => {
    expect(isValidPhone('987654321')).toBe(true);
    expect(isValidPhone('98765432')).toBe(false);
  });
});
