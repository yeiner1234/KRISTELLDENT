import { describe, expect, it } from 'vitest';
import { findSpecialtyByNames, normalizeText } from './specialtyMatch';
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
