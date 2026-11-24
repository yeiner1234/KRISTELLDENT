import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AppointmentFiltersBar from './AppointmentFiltersBar';

const filters = { date: '2026-11-24', professionalId: '', status: '' as const, branchId: '', query: '' };

describe('AppointmentFiltersBar (celular)', () => {
  it('los campos se despliegan con el botón "Filtros"; desde md siempre se ven', async () => {
    render(<AppointmentFiltersBar filters={filters} onChange={vi.fn()} professionals={[]} />);

    const toggle = screen.getByRole('button', { name: /Filtros/ });
    const fields = screen.getByTestId('filters-fields');

    expect(toggle).toHaveClass('md:hidden');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(fields).toHaveClass('hidden', 'md:contents');
    expect(screen.getByRole('searchbox', { name: 'Buscar citas' })).toBeInTheDocument();

    await userEvent.click(toggle);

    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(fields).toHaveClass('flex', 'md:contents');
    expect(fields).not.toHaveClass('hidden');
  });

  it('el botón cuenta los filtros activos', () => {
    render(
      <AppointmentFiltersBar
        filters={{ ...filters, status: 'pending', branchId: 'sede-1' }}
        onChange={vi.fn()}
        professionals={[]}
        branches={[{ id: 'sede-1', name: 'Jaén' }]}
      />,
    );

    expect(screen.getByRole('button', { name: /Filtros/ })).toHaveTextContent('Filtros2');
  });
});
