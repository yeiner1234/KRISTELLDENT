import { describe, expect, it } from 'vitest';
import { ACCENT_TONES, accentToneFor } from './accentTone';

describe('accentToneFor', () => {
  it('da siempre el mismo color al mismo nombre', () => {
    expect(accentToneFor('Ortodoncia')).toBe(accentToneFor('Ortodoncia'));
  });

  it('no distingue mayúsculas, tildes ni espacios de más', () => {
    expect(accentToneFor('  odontopediatría ')).toBe(accentToneFor('Odontopediatria'));
  });

  it('siempre devuelve uno de los tonos de la paleta', () => {
    for (const name of ['Cirugía Dental', 'Endodoncia', 'Periodoncia', '', 'KristellDent Jaén']) {
      expect(ACCENT_TONES).toContain(accentToneFor(name));
    }
  });

  it('reparte nombres distintos entre varios tonos', () => {
    const names = ['Cirugía Dental', 'Endodoncia', 'Odontología General', 'Odontopediatría', 'Ortodoncia', 'Periodoncia'];
    expect(new Set(names.map(accentToneFor)).size).toBeGreaterThanOrEqual(3);
  });
});
