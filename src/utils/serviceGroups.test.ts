import { describe, expect, it } from 'vitest';
import { groupServicesBySpecialty } from './serviceGroups';
import type { Service } from '../types/Service';
import type { Specialty } from '../types/Specialty';

const specialty = (id: string, name: string): Specialty => ({ id, name, description: null, active: true });
const service = (id: string, specialtyId: string): Service => ({
  id,
  name: id,
  specialtyId,
  branchId: 'b1',
  duration: 30,
  price: 0,
  active: true,
});

const specialties = [specialty('orto', 'Ortodoncia'), specialty('endo', 'Endodoncia'), specialty('peri', 'Periodoncia')];

describe('groupServicesBySpecialty', () => {
  it('agrupa por especialidad, ordenadas por nombre, y conserva el orden de los servicios', () => {
    const groups = groupServicesBySpecialty(
      [service('brackets', 'orto'), service('conducto', 'endo'), service('retenedor', 'orto')],
      specialties,
    );

    expect(groups.map((group) => [group.title, group.services.map((item) => item.id)])).toEqual([
      ['Endodoncia', ['conducto']],
      ['Ortodoncia', ['brackets', 'retenedor']],
    ]);
  });

  it('omite las especialidades sin servicios', () => {
    const groups = groupServicesBySpecialty([service('conducto', 'endo')], specialties);

    expect(groups.map((group) => group.key)).toEqual(['endo']);
  });

  it('junta al final los servicios de una especialidad desconocida', () => {
    const groups = groupServicesBySpecialty([service('raro', 'borrada'), service('conducto', 'endo')], specialties);

    expect(groups.map((group) => [group.title, group.services.map((item) => item.id)])).toEqual([
      ['Endodoncia', ['conducto']],
      ['Sin especialidad', ['raro']],
    ]);
  });

  it('sin servicios no hay grupos', () => {
    expect(groupServicesBySpecialty([], specialties)).toEqual([]);
  });
});
