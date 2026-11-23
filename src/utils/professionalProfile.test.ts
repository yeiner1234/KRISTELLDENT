import { describe, expect, it } from 'vitest';
import { profileGaps, profileGapsSummary } from './professionalProfile';
import type { AdminProfessional } from '../types/Professional';

const branches = [
  { id: 'jaen', name: 'Jaén', active: true },
  { id: 'bagua', name: 'Bagua', active: true },
  { id: 'chacha', name: 'Chachapoyas', active: false },
];

const base: AdminProfessional = {
  id: 'ana',
  fullName: 'ANali',
  role: 'especialista',
  bio: null,
  active: true,
  specialtyIds: ['orto'],
  branchIds: ['jaen', 'bagua'],
  serviceIds: ['s-jaen'],
  assignments: [{ serviceId: 's-jaen', branchId: 'jaen' }],
  scheduleBranchIds: ['jaen'],
};

describe('profileGaps', () => {
  it('ficha completa: servicios y horario en cada sede activa', () => {
    expect(profileGaps({ ...base, branchIds: ['jaen'] }, branches)).toEqual([]);
  });

  it('dice qué le falta en cada sede', () => {
    expect(profileGaps(base, branches)).toEqual([{ branchId: 'bagua', branchName: 'Bagua', missing: ['servicios', 'horario'] }]);
  });

  it('una sede inactiva no cuenta', () => {
    expect(profileGaps({ ...base, branchIds: ['jaen', 'chacha'] }, branches)).toEqual([]);
  });

  it('sin especialidad también es ficha incompleta', () => {
    expect(profileGaps({ ...base, branchIds: ['jaen'], specialtyIds: [] }, branches)).toEqual([
      { branchId: null, branchName: null, missing: ['especialidad'] },
    ]);
  });

  it('sin ninguna sede activa', () => {
    expect(profileGaps({ ...base, branchIds: [] }, branches)).toEqual([{ branchId: null, branchName: null, missing: ['sede'] }]);
  });
});

describe('profileGapsSummary', () => {
  it('texto corto para la tarjeta', () => {
    expect(profileGapsSummary(profileGaps(base, branches))).toBe('Bagua: falta servicios y horario');
    expect(
      profileGapsSummary([
        { branchId: null, branchName: null, missing: ['especialidad'] },
        { branchId: 'jaen', branchName: 'Jaén', missing: ['horario'] },
      ]),
    ).toBe('Falta especialidad · Jaén: falta horario');
  });
});
