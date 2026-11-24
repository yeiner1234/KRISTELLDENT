import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import AgendaGrid from './AgendaGrid';
import type { Appointment } from '../../types/Appointment';

function appointment(id: string, date: string, startTime: string): Appointment {
  return { id, date, startTime, endTime: '10:30', status: 'confirmed' } as Appointment;
}

// Miércoles 25 de noviembre de 2026, 9:00 en Lima.
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-25T14:00:00Z'));
});

afterEach(() => {
  vi.useRealTimers();
});

const cellOf = (text: string) => screen.getByText(text).closest('button')?.parentElement?.parentElement as HTMLElement;

describe('AgendaGrid en celular', () => {
  it('empieza en el día de hoy y oculta los demás días', () => {
    render(
      <AgendaGrid
        appointments={[appointment('a', '2026-11-25', '10:00'), appointment('b', '2026-11-23', '10:00')]}
        resolveTitle={(item) => (item.id === 'a' ? 'Cita de hoy' : 'Cita del lunes')}
      />,
    );

    expect(screen.getByRole('button', { name: 'Miércoles 25' })).toHaveAttribute('aria-pressed', 'true');
    expect(cellOf('Cita de hoy')).not.toHaveClass('hidden');
    expect(cellOf('Cita del lunes')).toHaveClass('hidden', 'md:block');
  });

  it('el selector L M X J V S cambia el día que se ve', () => {
    render(
      <AgendaGrid
        appointments={[appointment('b', '2026-11-23', '10:00')]}
        resolveTitle={() => 'Cita del lunes'}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Lunes 23' }));

    expect(screen.getByRole('button', { name: 'Lunes 23' })).toHaveAttribute('aria-pressed', 'true');
    expect(cellOf('Cita del lunes')).not.toHaveClass('hidden');
  });

  it('las flechas pasan de día y cambian de semana después del sábado', () => {
    render(<AgendaGrid appointments={[]} />);

    for (let i = 0; i < 3; i += 1) {
      fireEvent.click(screen.getByRole('button', { name: 'Día siguiente' }));
    }
    expect(screen.getByRole('button', { name: 'Sábado 28' })).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByRole('button', { name: 'Día siguiente' }));
    expect(screen.queryByRole('button', { name: 'Sábado 28' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Lunes 30' })).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByRole('button', { name: 'Día anterior' }));
    expect(screen.getByRole('button', { name: 'Sábado 28' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('la navegación por semana queda para tablet y escritorio', () => {
    render(<AgendaGrid appointments={[]} />);

    expect(screen.getByRole('button', { name: 'Semana anterior' }).parentElement).toHaveClass('hidden', 'md:flex');
    expect(screen.getByRole('group', { name: 'Día de la semana' }).parentElement).toHaveClass('md:hidden');
  });
});
