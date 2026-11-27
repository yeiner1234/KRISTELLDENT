import { describe, expect, it } from 'vitest';
import { adminDocumentCode, adminReportScope, doctorSpecialty, doctorsInScope } from './adminHeader';

const branches = [
  { id: 'jaen', name: 'Jaén', address: 'Mesones Muro 120' },
  { id: 'bagua', name: 'Bagua', address: 'Comercio N.° 367' },
];

describe('encabezado de los reportes de administración', () => {
  it('admin global con todas las sedes', () => {
    expect(adminReportScope({ isGlobal: true, branchId: '', allowedBranches: branches })).toEqual({
      level: 'Nivel global',
      levelKey: 'global',
      branchLine: 'Jaén · Bagua',
      scope: 'Todas las sedes (2)',
      branchFilter: 'Todas (2)',
      place: 'todas las sedes',
      branchName: null,
    });
  });

  it('admin global con una sede elegida', () => {
    expect(adminReportScope({ isGlobal: true, branchId: 'bagua', allowedBranches: branches })).toMatchObject({
      level: 'Nivel global',
      branchLine: 'Sede Bagua · Comercio N.° 367',
      scope: 'Sede Bagua',
      branchFilter: 'Bagua',
      place: 'la sede Bagua',
      branchName: 'Bagua',
    });
  });

  it('admin de sede: siempre su sede asignada', () => {
    expect(adminReportScope({ isGlobal: false, branchId: '', allowedBranches: [branches[1]] })).toEqual({
      level: 'Nivel sede',
      levelKey: 'sede',
      branchLine: 'Sede Bagua · Comercio N.° 367',
      scope: 'Solo sede Bagua',
      branchFilter: 'Bagua (asignada)',
      place: 'la sede Bagua',
      branchName: 'Bagua',
    });
  });

  it('código del documento con la sede o GLO y la fecha de emisión', () => {
    expect(adminDocumentCode('REP-CIT', 'Bagua Grande', '2026-10-14')).toBe('REP-CIT-BAG-2026-1014');
    expect(adminDocumentCode('REP-ING', null, '2026-10-14')).toBe('REP-ING-GLO-2026-1014');
  });
});

describe('doctoras del reporte', () => {
  const professionals = [
    { id: 'd1', fullName: 'Lucía Mendoza Paz', branchIds: ['bagua'], role: 'especialista', specialtyIds: ['endo'] },
    { id: 'd2', fullName: 'Ana Torres Ríos', branchIds: ['jaen'], role: 'odontologa_general', specialtyIds: [] },
  ];

  it('las de la sede elegida o de todas las permitidas', () => {
    expect(doctorsInScope(professionals, ['bagua', 'jaen'], '')).toEqual([
      { id: 'd2', name: 'Dra. Ana Torres Ríos' },
      { id: 'd1', name: 'Dra. Lucía Mendoza Paz' },
    ]);
    expect(doctorsInScope(professionals, ['bagua', 'jaen'], 'bagua').map((doctor) => doctor.id)).toEqual(['d1']);
  });

  it('su especialidad; la odontóloga general, Odontología general', () => {
    const specialties = [{ id: 'endo', name: 'Endodoncia' }];
    expect(doctorSpecialty(professionals[0], specialties)).toBe('Endodoncia');
    expect(doctorSpecialty(professionals[1], specialties)).toBe('Odontología general');
    expect(doctorSpecialty(undefined, specialties)).toBe('—');
  });
});
