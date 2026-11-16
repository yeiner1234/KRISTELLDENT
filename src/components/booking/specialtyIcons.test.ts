import { describe, expect, it } from 'vitest';
import { Baby, MoveHorizontal, Scissors, ShieldPlus, Smile, Syringe } from 'lucide-react';
import { getSpecialtyIcon } from './specialtyIcons';

describe('getSpecialtyIcon', () => {
  it('elige el icono por el nombre, sin importar tildes ni mayúsculas', () => {
    expect(getSpecialtyIcon('Odontología General')).toBe(Smile);
    expect(getSpecialtyIcon('ORTODONCIA')).toBe(MoveHorizontal);
    expect(getSpecialtyIcon('Endodoncia')).toBe(Syringe);
    expect(getSpecialtyIcon('Periodoncia')).toBe(ShieldPlus);
    expect(getSpecialtyIcon('Odontopediatria')).toBe(Baby);
    expect(getSpecialtyIcon('Cirugía oral')).toBe(Scissors);
  });

  it('con un nombre desconocido usa el icono general', () => {
    expect(getSpecialtyIcon('Estética')).toBe(Smile);
  });
});
