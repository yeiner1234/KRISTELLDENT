import { afterEach, describe, expect, it, vi } from 'vitest';
import { addDaysToIsoDate, getAgendaWeekStart, getLimaNowTime, getTodayIsoDate, shiftAgendaDay } from './date';

describe('getTodayIsoDate', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('devuelve el día de Lima cuando en UTC ya es el día siguiente', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-14T03:30:00Z')); // 22:30 del 13 en Lima

    expect(getTodayIsoDate()).toBe('2026-11-13');
  });

  it('devuelve la fecha en formato AAAA-MM-DD a mitad del día', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-13T15:00:00Z'));

    expect(getTodayIsoDate()).toBe('2026-11-13');
  });
});

describe('getLimaNowTime', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('devuelve la hora HH:MM de Lima (UTC-5)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-14T03:05:00Z'));

    expect(getLimaNowTime()).toBe('22:05');
  });

  it('a medianoche de Lima devuelve 00:xx, no 24:xx', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-14T05:07:00Z'));

    expect(getLimaNowTime()).toBe('00:07');
  });
});

describe('addDaysToIsoDate', () => {
  it('cruza meses y años', () => {
    expect(addDaysToIsoDate('2026-11-30', 1)).toBe('2026-12-01');
    expect(addDaysToIsoDate('2026-03-01', -1)).toBe('2026-02-28');
    expect(addDaysToIsoDate('2026-12-31', 1)).toBe('2027-01-01');
  });
});

describe('getAgendaWeekStart', () => {
  it('en domingo abre la semana que empieza mañana', () => {
    expect(getAgendaWeekStart('2026-11-15')).toBe('2026-11-16');
  });

  it('de lunes a sábado abre en el lunes de esa semana', () => {
    expect(getAgendaWeekStart('2026-11-16')).toBe('2026-11-16');
    expect(getAgendaWeekStart('2026-11-18')).toBe('2026-11-16');
    expect(getAgendaWeekStart('2026-11-21')).toBe('2026-11-16');
  });
});

describe('shiftAgendaDay', () => {
  it('se mueve dentro de la semana (lunes a sábado)', () => {
    expect(shiftAgendaDay('2026-11-23', 2, 1)).toEqual({ weekStart: '2026-11-23', dayIndex: 3 });
    expect(shiftAgendaDay('2026-11-23', 2, -1)).toEqual({ weekStart: '2026-11-23', dayIndex: 1 });
  });

  it('pasado el sábado va al lunes de la semana siguiente', () => {
    expect(shiftAgendaDay('2026-11-23', 5, 1)).toEqual({ weekStart: '2026-11-30', dayIndex: 0 });
  });

  it('antes del lunes va al sábado de la semana anterior', () => {
    expect(shiftAgendaDay('2026-11-23', 0, -1)).toEqual({ weekStart: '2026-11-16', dayIndex: 5 });
  });
});
