import { describe, expect, it } from 'vitest';
import { pdfFileName, planPageBreaks } from './pdfPages';

describe('planPageBreaks', () => {
  it('todo cabe en una página: un solo tramo', () => {
    expect(planPageBreaks([100, 300], 500, 1000)).toEqual([{ start: 0, end: 500 }]);
  });

  it('corta en el último borde de fila que cabe en cada página', () => {
    // Filas que terminan en 300, 650, 900, 1250, 1500; páginas de 1000.
    expect(planPageBreaks([300, 650, 900, 1250, 1500], 1500, 1000)).toEqual([
      { start: 0, end: 900 },
      { start: 900, end: 1500 },
    ]);
  });

  it('un bloque más alto que una página se corta a la altura de la página', () => {
    expect(planPageBreaks([2500], 2500, 1000)).toEqual([
      { start: 0, end: 1000 },
      { start: 1000, end: 2000 },
      { start: 2000, end: 2500 },
    ]);
  });

  it('ignora bordes repetidos, fuera de rango o demasiado cerca del inicio', () => {
    expect(planPageBreaks([0, 5, 900, 900, 3000], 1800, 1000)).toEqual([
      { start: 0, end: 900 },
      { start: 900, end: 1800 },
    ]);
  });
});

describe('pdfFileName', () => {
  it('limpia el código del documento para el nombre del archivo', () => {
    expect(pdfFileName('REP-CIT-GLO-2026-1014')).toBe('REP-CIT-GLO-2026-1014.pdf');
    expect(pdfFileName('Historia: Guevara Núñez / HC-00245')).toBe('Historia-Guevara-Nunez-HC-00245.pdf');
    expect(pdfFileName('')).toBe('reporte-kristelldent.pdf');
  });
});
