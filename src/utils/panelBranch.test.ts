import { describe, expect, it } from 'vitest';
import { dayOfWeekOf, defaultPanelBranch, filterByPanelBranch } from './panelBranch';
import type { Appointment } from '../types/Appointment';

const appointment = (id: string, branchId: string): Appointment => ({
  id,
  code: id,
  patientId: 'pt',
  professionalId: 'p',
  branchId,
  serviceId: null,
  date: '2026-11-23',
  startTime: '09:00',
  endTime: '09:30',
  status: 'pending',
  reason: '',
});

describe('defaultPanelBranch', () => {
  it('elige la única sede donde tiene horario hoy', () => {
    expect(defaultPanelBranch(['bagua', 'jaen'], ['jaen'])).toBe('jaen');
  });

  it('con varias sedes hoy o ninguna, todas (\'\')', () => {
    expect(defaultPanelBranch(['bagua', 'jaen'], ['bagua', 'jaen'])).toBe('');
    expect(defaultPanelBranch(['bagua', 'jaen'], [])).toBe('');
  });

  it('ignora un horario en una sede que ya no es suya', () => {
    expect(defaultPanelBranch(['bagua', 'jaen'], ['chacha'])).toBe('');
  });
});

describe('filterByPanelBranch', () => {
  const list = [appointment('a1', 'bagua'), appointment('a2', 'jaen')];

  it('deja solo las citas de esa sede', () => {
    expect(filterByPanelBranch(list, 'jaen').map((item) => item.id)).toEqual(['a2']);
  });

  it('sin sede elegida devuelve todas', () => {
    expect(filterByPanelBranch(list, '')).toBe(list);
  });
});

describe('dayOfWeekOf', () => {
  it('0 = domingo, igual que day_of_week en la base', () => {
    expect(dayOfWeekOf('2026-11-22')).toBe(0);
    expect(dayOfWeekOf('2026-11-23')).toBe(1);
  });
});
