import { describe, expect, it } from 'vitest';
import { isBranchClosedOn } from './businessHours';

describe('isBranchClosedOn', () => {
  const hours = { mon: { open: '09:00', close: '18:00' } };

  it('un lunes con horario está abierto', () => {
    expect(isBranchClosedOn('2026-11-16', hours)).toBe(false);
  });

  it('un domingo sin horario está cerrado', () => {
    expect(isBranchClosedOn('2026-11-15', hours)).toBe(true);
  });
});
