import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BranchSelector from './BranchSelector';

const branchesState = vi.hoisted(() => ({
  value: { branches: [] as unknown[], isLoading: false, error: null as string | null },
}));

vi.mock('../../hooks/useBranches', () => ({
  useBranches: () => branchesState.value,
}));
vi.mock('../../hooks/useBranchOpenStatus', () => ({
  useBranchOpenStatus: (id: string) => ({ isOpen: id === 'b1', todayLabel: 'Hoy 08:00 – 17:00' }),
}));

const branches = [
  { id: 'b1', name: 'KristellDent Bagua Grande', address: 'Jr. Ayacucho 815', region: 'Amazonas' },
  { id: 'b2', name: 'KristellDent Chiclayo', address: 'Av. Balta 1120', region: 'Lambayeque' },
];

describe('BranchSelector', () => {
  beforeEach(() => {
    branchesState.value = { branches, isLoading: false, error: null };
  });

  it('si fallan las sedes muestra el error y no "No hay sedes registradas"', () => {
    branchesState.value = { branches: [], isLoading: false, error: 'No se pudieron cargar las sedes.' };
    render(<BranchSelector selectedId={null} onSelect={vi.fn()} />);

    expect(screen.getByText('No se pudieron cargar las sedes.')).toBeInTheDocument();
    expect(screen.queryByText('No hay sedes registradas')).not.toBeInTheDocument();
  });

  it('muestra cada sede con su dirección, horario de hoy y si está abierta', () => {
    render(<BranchSelector selectedId={null} onSelect={vi.fn()} />);

    const bagua = screen.getByRole('button', { name: /Bagua Grande/ });
    expect(bagua).toHaveTextContent('Jr. Ayacucho 815');
    expect(bagua).toHaveTextContent('Amazonas');
    expect(bagua).toHaveTextContent('Hoy 08:00 – 17:00');
    expect(bagua).toHaveTextContent('Abierta');
    expect(screen.getByRole('button', { name: /Chiclayo/ })).toHaveTextContent('Cerrada');
  });

  it('elegir una sede avisa cuál y la marca como elegida', async () => {
    const onSelect = vi.fn();
    const { rerender } = render(<BranchSelector selectedId={null} onSelect={onSelect} />);

    await userEvent.click(screen.getByRole('button', { name: /Chiclayo/ }));
    expect(onSelect).toHaveBeenCalledWith('b2');

    rerender(<BranchSelector selectedId="b2" onSelect={onSelect} />);
    expect(screen.getByRole('button', { name: /Chiclayo/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /Bagua Grande/ })).toHaveAttribute('aria-pressed', 'false');
  });
});
