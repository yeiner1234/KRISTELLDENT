import { describe, expect, it } from 'vitest';
import { professionalStatus, profileGaps, profileGapsSummary } from './professionalProfile';
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
  accountActive: true,
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

describe('professionalStatus', () => {
  it('cuenta y ficha activas', () => {
    expect(professionalStatus(base)).toEqual({ label: 'Activa', tone: 'adm-active' });
  });

  it('la cuenta desactivada en Equipo manda, aunque la ficha esté activa', () => {
    expect(professionalStatus({ ...base, accountActive: false })).toEqual({
      label: 'Cuenta desactivada (Equipo)',
      tone: 'adm-inactive',
    });
    expect(professionalStatus({ ...base, accountActive: false, active: false }).label).toBe('Cuenta desactivada (Equipo)');
  });

  it('ficha desactivada con la cuenta activa', () => {
    expect(professionalStatus({ ...base, active: false })).toEqual({ label: 'Ficha desactivada', tone: 'adm-inactive' });
  });
});
