import { describe, expect, it } from 'vitest';
import { findSpecialtyByNames, isSameSpecialtyName, nameKey, normalizeText, similarSpecialties } from './specialtyMatch';
import { attentionMotives } from '../components/booking/attentionMotives';

// Las que crea supabase/scripts/seed_test_data.sql (no hay Ortodoncia).
const seedSpecialties = [
  { id: 'u1', name: 'Odontología General' },
  { id: 'u2', name: 'Endodoncia' },
  { id: 'u3', name: 'Periodoncia' },
  { id: 'u4', name: 'Odontopediatría' },
  { id: 'u5', name: 'Cirugía Dental' },
];

describe('normalizeText', () => {
  it('pasa a minúsculas y quita tildes y espacios de los extremos', () => {
    expect(normalizeText('  Odontopediatría ')).toBe('odontopediatria');
  });
});

describe('findSpecialtyByNames', () => {
  it('encuentra el nombre aunque cambien tildes y mayúsculas', () => {
    expect(findSpecialtyByNames(seedSpecialties, ['odontologia general'])?.id).toBe('u1');
  });

  it('cae al siguiente candidato si el primero no existe', () => {
    expect(findSpecialtyByNames(seedSpecialties, ['Ortodoncia', 'Odontología General'])?.id).toBe('u1');
  });

  it('prefiere el nombre exacto sobre uno que solo lo contiene', () => {
    const specialties = [{ id: 'prueba', name: 'PRUEBA Odontologia General' }, ...seedSpecialties];
    expect(findSpecialtyByNames(specialties, ['Odontología General'])?.id).toBe('u1');
  });

  it('acepta un nombre que contiene al candidato', () => {
    expect(findSpecialtyByNames([{ id: 'x', name: 'Endodoncia y Microscopía' }], ['Endodoncia'])?.id).toBe('x');
  });

  it('devuelve null si no hay coincidencias', () => {
    expect(findSpecialtyByNames(seedSpecialties, ['Ortodoncia'])).toBeNull();
  });

  it('cada motivo de atención lleva a una especialidad del script de prueba', () => {
    for (const motive of attentionMotives) {
      expect(findSpecialtyByNames(seedSpecialties, motive.recommendedSpecialtyNames), motive.id).not.toBeNull();
    }
  });

  it('corregir la posición va a Odontología General cuando no hay Ortodoncia', () => {
    const alignment = attentionMotives.find((motive) => motive.id === 'alignment');
    expect(findSpecialtyByNames(seedSpecialties, alignment?.recommendedSpecialtyNames ?? [])?.name).toBe(
      'Odontología General',
    );
  });
});

describe('nameKey', () => {
  it('igual que name_key de la base: sin tildes, mayúsculas ni espacios de más', () => {
    expect(nameKey('  Rehabilitación   Oral ')).toBe('rehabilitacion oral');
    expect(nameKey('ODONTOPEDIATRÍA')).toBe('odontopediatria');
  });
});

describe('similarSpecialties', () => {
  const list = [
    { id: 'orto', name: 'Ortodoncia' },
    { id: 'rehab', name: 'Rehabilitación oral' },
    { id: 'endo', name: 'Endodoncia' },
  ];

  it('encuentra la misma especialidad escrita distinto', () => {
    expect(similarSpecialties('rehabilitacion  oral', list).map((s) => s.id)).toEqual(['rehab']);
  });

  it('encuentra una parecida con un error de tipeo o una parte del nombre', () => {
    expect(similarSpecialties('Ortodoncai', list).map((s) => s.id)).toEqual(['orto']);
    expect(similarSpecialties('rehabilitación', list).map((s) => s.id)).toEqual(['rehab']);
  });

  it('con un texto corto o distinto no sugiere nada', () => {
    expect(similarSpecialties('or', list)).toEqual([]);
    expect(similarSpecialties('Cirugía maxilofacial', list)).toEqual([]);
  });

  it('marca si es exactamente la misma', () => {
    expect(isSameSpecialtyName('ORTODONCIA ', 'Ortodoncia')).toBe(true);
    expect(isSameSpecialtyName('Ortodoncia infantil', 'Ortodoncia')).toBe(false);
  });
});
