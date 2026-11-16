import { describe, expect, it } from 'vitest';
import { availabilityForDay, segmentInHour } from './agendaAvailability';

// 2026-11-16 es lunes.
const MONDAY = '2026-11-16';
const weekly = [
  { dayOfWeek: 1, startTime: '09:00', endTime: '13:00', branchId: 'A' },
  { dayOfWeek: 2, startTime: '14:00', endTime: '18:00', branchId: 'A' },
];

function exception(partial: Partial<{ date: string; isAvailable: boolean; startTime: string | null; endTime: string | null }>) {
  return { date: MONDAY, isAvailable: false, startTime: null, endTime: null, ...partial };
}

describe('availabilityForDay', () => {
  it('devuelve el horario semanal de ese día de la semana', () => {
    expect(availabilityForDay(MONDAY, weekly, [])).toEqual([{ start: '09:00', end: '13:00', kind: 'work' }]);
  });

  it('un día sin horario no tiene bloques', () => {
    expect(availabilityForDay('2026-11-15', weekly, [])).toEqual([]);
  });

  it('una ausencia de día completo convierte todo el horario en ausencia', () => {
    expect(availabilityForDay(MONDAY, weekly, [exception({})])).toEqual([{ start: '09:00', end: '13:00', kind: 'absence' }]);
  });

  it('una ausencia parcial parte el bloque de trabajo', () => {
    expect(availabilityForDay(MONDAY, weekly, [exception({ startTime: '10:00', endTime: '11:00' })])).toEqual([
      { start: '09:00', end: '10:00', kind: 'work' },
      { start: '10:00', end: '11:00', kind: 'absence' },
      { start: '11:00', end: '13:00', kind: 'work' },
    ]);
  });

  it('un turno extra se agrega como bloque propio', () => {
    expect(
      availabilityForDay(MONDAY, weekly, [exception({ isAvailable: true, startTime: '15:00', endTime: '17:00' })]),
    ).toEqual([
      { start: '09:00', end: '13:00', kind: 'work' },
      { start: '15:00', end: '17:00', kind: 'extra' },
    ]);
  });

  it('ignora excepciones de otras fechas', () => {
    expect(availabilityForDay(MONDAY, weekly, [exception({ date: '2026-11-17' })])).toEqual([
      { start: '09:00', end: '13:00', kind: 'work' },
    ]);
  });
});

describe('segmentInHour', () => {
  it('un bloque que cubre la hora entera ocupa el 100%', () => {
    expect(segmentInHour({ start: '09:00', end: '13:00' }, 10)).toEqual({ topPct: 0, heightPct: 100 });
  });

  it('un bloque que empieza a la media hora ocupa la mitad de abajo', () => {
    expect(segmentInHour({ start: '09:30', end: '13:00' }, 9)).toEqual({ topPct: 50, heightPct: 50 });
  });

  it('un bloque fuera de la hora no aparece', () => {
    expect(segmentInHour({ start: '09:00', end: '13:00' }, 13)).toBeNull();
  });
});
