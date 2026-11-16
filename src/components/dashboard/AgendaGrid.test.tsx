import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import AgendaGrid from './AgendaGrid';
import type { AvailabilityBlock } from '../../utils/agendaAvailability';

// Semana del lunes 16 al domingo 22 de noviembre de 2026.
const weekStart = new Date(2026, 10, 16);

function blocksFor(isoDate: string): AvailabilityBlock[] {
  if (isoDate === '2026-11-16') {
    return [
      { start: '09:00', end: '10:00', kind: 'work' },
      { start: '10:00', end: '11:00', kind: 'absence' },
      { start: '11:00', end: '13:00', kind: 'work' },
    ];
  }
  if (isoDate === '2026-11-22') {
    return [{ start: '09:00', end: '10:00', kind: 'extra' }];
  }
  return [];
}

describe('AgendaGrid', () => {
  it('pinta el horario de trabajo, las ausencias y los turnos extra del profesional', () => {
    render(<AgendaGrid appointments={[]} weekStart={weekStart} onWeekStartChange={() => {}} availability={blocksFor} />);

    // 09–10 y 11–13 = 3 filas de una hora con horario de trabajo.
    expect(screen.getAllByTitle('Horario de trabajo 09:00–10:00')).toHaveLength(1);
    expect(screen.getAllByTitle('Horario de trabajo 11:00–13:00')).toHaveLength(2);
    expect(screen.getByTitle('Ausencia 10:00–11:00')).toBeInTheDocument();
    // El domingo también se muestra.
    expect(screen.getByTitle('Turno extra 09:00–10:00')).toBeInTheDocument();
    expect(screen.getByText('Horario de trabajo')).toBeInTheDocument();
  });

  it('sin disponibilidad no muestra la leyenda', () => {
    render(<AgendaGrid appointments={[]} weekStart={weekStart} onWeekStartChange={() => {}} />);

    expect(screen.queryByText('Horario de trabajo')).not.toBeInTheDocument();
  });
});
