import { describe, expect, it } from 'vitest';
import { indicatorShare, monthRange, summarizeIndicators, type IndicatorRow } from './appointmentIndicators';

const row = (overrides: Partial<IndicatorRow>): IndicatorRow => ({
  branchId: 'sede-1',
  professionalId: 'ana',
  status: 'confirmed',
  isPast: false,
  total: 1,
  ...overrides,
});

describe('summarizeIndicators (HU16)', () => {
  it('clasifica por estado: atendidas, no asistidas, canceladas y por atender', () => {
    const summary = summarizeIndicators([
      row({ status: 'completed', isPast: true, total: 5 }),
      row({ status: 'cancelled', total: 2 }),
      // Pendientes o confirmadas cuya hora ya pasó: no asistieron.
      row({ status: 'pending', isPast: true, total: 1 }),
      row({ status: 'confirmed', isPast: true, total: 3 }),
      // Por atender: futuras y en sala.
      row({ status: 'pending', isPast: false, total: 4 }),
      row({ status: 'in_room', isPast: true, total: 1 }),
    ]);

    expect(summary.totals).toEqual({ reserved: 16, attended: 5, noShow: 4, cancelled: 2, upcoming: 5 });
  });

  it('reservadas = atendidas + no asistidas + canceladas + por atender', () => {
    const { totals } = summarizeIndicators([
      row({ status: 'completed', total: 7 }),
      row({ status: 'confirmed', isPast: true, total: 2 }),
      row({ status: 'cancelled', total: 1 }),
      row({ status: 'confirmed', total: 3 }),
    ]);

    expect(totals.reserved).toBe(totals.attended + totals.noShow + totals.cancelled + totals.upcoming);
  });

  it('desglosa por profesional y por sede, de más a menos citas', () => {
    const summary = summarizeIndicators([
      row({ professionalId: 'ana', branchId: 'sede-1', status: 'completed', total: 2 }),
      row({ professionalId: 'eva', branchId: 'sede-2', status: 'completed', total: 5 }),
      row({ professionalId: 'eva', branchId: 'sede-1', status: 'cancelled', total: 1 }),
    ]);

    expect(summary.byProfessional.map((item) => [item.id, item.reserved])).toEqual([
      ['eva', 6],
      ['ana', 2],
    ]);
    expect(summary.byBranch.map((item) => [item.id, item.reserved])).toEqual([
      ['sede-2', 5],
      ['sede-1', 3],
    ]);
    expect(summary.byProfessional[0]).toMatchObject({ attended: 5, cancelled: 1 });
  });

  it('sin citas todo queda en cero', () => {
    const summary = summarizeIndicators([]);

    expect(summary.totals).toEqual({ reserved: 0, attended: 0, noShow: 0, cancelled: 0, upcoming: 0 });
    expect(summary.byProfessional).toEqual([]);
  });
});

describe('monthRange', () => {
  it('del primer al último día del mes de la fecha dada', () => {
    expect(monthRange('2026-11-25')).toEqual({ from: '2026-11-01', to: '2026-11-30' });
    expect(monthRange('2028-02-10')).toEqual({ from: '2028-02-01', to: '2028-02-29' });
    expect(monthRange('2026-12-31')).toEqual({ from: '2026-12-01', to: '2026-12-31' });
  });
});

describe('indicatorShare', () => {
  it('porcentaje entero del total, 0 si no hay citas', () => {
    expect(indicatorShare(1, 3)).toBe(33);
    expect(indicatorShare(2, 3)).toBe(67);
    expect(indicatorShare(0, 0)).toBe(0);
  });
});
