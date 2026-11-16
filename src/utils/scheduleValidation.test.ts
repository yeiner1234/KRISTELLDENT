import { describe, expect, it } from 'vitest';
import { rangesOutsideBranchHours, validateDayRanges, validateWeeklySchedule } from './scheduleValidation';

describe('validateDayRanges', () => {
  it('rechaza un rango cuyo fin no es posterior al inicio', () => {
    expect(validateDayRanges([{ start: '13:00', end: '13:00' }])).toBe('La hora de fin debe ser posterior a la de inicio.');
    expect(validateDayRanges([{ start: '14:00', end: '09:00' }])).toBe('La hora de fin debe ser posterior a la de inicio.');
  });

  it('rechaza rangos del mismo día que se cruzan', () => {
    expect(validateDayRanges([{ start: '09:00', end: '13:00' }, { start: '12:00', end: '14:00' }])).toBe('Los rangos se cruzan.');
  });

  it('detecta el cruce aunque los rangos vengan desordenados', () => {
    expect(validateDayRanges([{ start: '15:00', end: '18:00' }, { start: '09:00', end: '16:00' }])).toBe('Los rangos se cruzan.');
  });

  it('acepta rangos que solo se tocan', () => {
    expect(validateDayRanges([{ start: '09:00', end: '13:00' }, { start: '13:00', end: '17:00' }])).toBeNull();
  });

  it('rechaza un rango sin hora', () => {
    expect(validateDayRanges([{ start: '', end: '13:00' }])).toBe('Completa la hora de inicio y de fin.');
  });
});

describe('validateWeeklySchedule', () => {
  it('antepone el nombre del día al error', () => {
    const error = validateWeeklySchedule([
      { dayOfWeek: 1, startTime: '09:00', endTime: '13:00' },
      { dayOfWeek: 1, startTime: '12:30', endTime: '15:00' },
    ]);
    expect(error).toBe('Lunes: Los rangos se cruzan.');
  });

  it('no confunde rangos de días distintos con un cruce', () => {
    expect(
      validateWeeklySchedule([
        { dayOfWeek: 1, startTime: '09:00', endTime: '13:00' },
        { dayOfWeek: 2, startTime: '10:00', endTime: '12:00' },
      ]),
    ).toBeNull();
  });
});

describe('rangesOutsideBranchHours', () => {
  const branchSchedule = [{ dayOfWeek: 1, openTime: '08:00', closeTime: '14:00' }];

  it('marca el día con un rango que empieza antes de que abra la sede', () => {
    expect(rangesOutsideBranchHours([{ dayOfWeek: 1, startTime: '07:00', endTime: '10:00' }], branchSchedule)).toEqual([1]);
  });

  it('marca el día en que la sede está cerrada', () => {
    expect(rangesOutsideBranchHours([{ dayOfWeek: 2, startTime: '09:00', endTime: '10:00' }], branchSchedule)).toEqual([2]);
  });

  it('no marca rangos dentro del horario de la sede', () => {
    expect(rangesOutsideBranchHours([{ dayOfWeek: 1, startTime: '08:00', endTime: '14:00' }], branchSchedule)).toEqual([]);
  });
});
