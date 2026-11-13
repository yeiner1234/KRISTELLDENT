import { afterEach, describe, expect, it, vi } from 'vitest';
import { getTodayIsoDate } from './date';

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
