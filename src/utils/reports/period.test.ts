import { describe, expect, it } from 'vitest';
import {
  daysBetween,
  defaultReportPeriod,
  formatComparisonRange,
  formatDayMonthYear,
  formatDmy,
  formatPeriodRange,
  monthBuckets,
  percentChange,
  periodBuckets,
  periodDays,
  previousPeriod,
} from './period';

describe('periodo de los reportes', () => {
  it('por defecto, los últimos tres meses hasta hoy', () => {
    expect(defaultReportPeriod('2026-11-26')).toEqual({ from: '2026-09-01', to: '2026-11-26' });
    expect(defaultReportPeriod('2026-02-10')).toEqual({ from: '2025-12-01', to: '2026-02-10' });
  });

  it('cuenta los días con ambos extremos', () => {
    expect(periodDays('2026-07-01', '2026-09-30')).toBe(92);
    expect(daysBetween('2026-09-05', '2026-10-14')).toBe(39);
  });

  it('el periodo anterior: mismos meses hacia atrás si empieza el día 1', () => {
    expect(previousPeriod('2026-07-01', '2026-09-30')).toEqual({ from: '2026-04-01', to: '2026-06-30' });
    expect(previousPeriod('2026-09-01', '2026-11-26')).toEqual({ from: '2026-06-01', to: '2026-08-26' });
    // 31 de mayo menos un mes: el último día de abril.
    expect(previousPeriod('2026-05-01', '2026-05-31')).toEqual({ from: '2026-04-01', to: '2026-04-30' });
  });

  it('el periodo anterior: los mismos días justo antes si no empieza el día 1', () => {
    expect(previousPeriod('2026-07-10', '2026-07-19')).toEqual({ from: '2026-06-30', to: '2026-07-09' });
  });

  it('formatea el rango como en la plantilla', () => {
    expect(formatPeriodRange('2026-07-01', '2026-09-30')).toBe('01 jul – 30 set 2026');
    expect(formatPeriodRange('2025-12-15', '2026-01-14')).toBe('15 dic 2025 – 14 ene 2026');
    expect(formatComparisonRange('2026-04-01', '2026-06-30')).toBe('abr – jun 2026');
    expect(formatComparisonRange('2026-06-30', '2026-07-09')).toBe('30 jun – 09 jul 2026');
    expect(formatDmy('2026-09-05')).toBe('05/09/2026');
    expect(formatDayMonthYear('2024-03-12')).toBe('12 mar 2024');
  });

  it('meses del periodo con su nombre', () => {
    expect(monthBuckets('2026-07-15', '2026-09-02')).toEqual([
      { key: '2026-07', label: 'Julio', from: '2026-07-15', to: '2026-07-31' },
      { key: '2026-08', label: 'Agosto', from: '2026-08-01', to: '2026-08-31' },
      { key: '2026-09', label: 'Setiembre', from: '2026-09-01', to: '2026-09-02' },
    ]);
  });

  it('semanas del periodo, de lunes a domingo', () => {
    expect(periodBuckets('2026-09-02', '2026-09-15', 'weekly')).toEqual([
      { key: '2026-08-31', label: '31/08', from: '2026-09-02', to: '2026-09-06' },
      { key: '2026-09-07', label: '07/09', from: '2026-09-07', to: '2026-09-13' },
      { key: '2026-09-14', label: '14/09', from: '2026-09-14', to: '2026-09-15' },
    ]);
  });

  it('variación porcentual; sin base, null', () => {
    expect(percentChange(242, 230)).toBeCloseTo(5.2, 1);
    expect(percentChange(5, 0)).toBeNull();
  });
});
