import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import BranchSelector from './BranchSelector';

vi.mock('../../hooks/useBranches', () => ({
  useBranches: () => ({ branches: [], isLoading: false, error: 'No se pudieron cargar las sedes.' }),
}));

describe('BranchSelector', () => {
  it('si fallan las sedes muestra el error y no "No hay sedes registradas"', () => {
    render(<BranchSelector selectedId={null} onSelect={vi.fn()} />);

    expect(screen.getByText('No se pudieron cargar las sedes.')).toBeInTheDocument();
    expect(screen.queryByText('No hay sedes registradas')).not.toBeInTheDocument();
  });
});
