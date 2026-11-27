import { describe, expect, it } from 'vitest';
import { reportBranchLine, reportDocumentCode, trendFromChange } from './reportHeader';

const panelBranches = [
  { id: 'b1', name: 'Bagua' },
  { id: 'b2', name: 'Jaén' },
];
const branches = [{ id: 'b1', name: 'Bagua', address: 'Comercio N.° 367' }];

describe('encabezado de los reportes', () => {
  it('línea de la sede: con sede elegida, su dirección; con todas, sus nombres', () => {
    expect(reportBranchLine('b1', panelBranches, branches)).toBe('Sede Bagua · Comercio N.° 367');
    expect(reportBranchLine('b2', panelBranches, branches)).toBe('Sede Jaén');
    expect(reportBranchLine('', panelBranches, branches)).toBe('Sedes Bagua · Jaén');
    expect(reportBranchLine('', [], branches)).toBe('Todas sus sedes');
  });

  it('código del documento con las iniciales y la fecha de emisión', () => {
    expect(reportDocumentCode('REP-CIT', 'Lucía Mendoza Paz', '2026-10-14')).toBe('REP-CIT-LM-2026-1014');
    expect(reportDocumentCode('REP-PAC', '', '2026-10-14')).toBe('REP-PAC-2026-1014');
  });

  it('variación frente al periodo anterior', () => {
    expect(trendFromChange(5.2, '%', true)).toEqual({ value: 5.2, text: '5.2 % vs. periodo anterior', good: true });
    expect(trendFromChange(-9.5, '%', false)).toEqual({ value: -9.5, text: '9.5 % vs. periodo anterior', good: false });
    expect(trendFromChange(1.3, 'pp', true)).toEqual({ value: 1.3, text: '1.3 pp', good: true });
    expect(trendFromChange(null, '%', true)).toBeNull();
  });
});
