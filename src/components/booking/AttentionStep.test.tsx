import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AttentionStep from './AttentionStep';

const offer = vi.hoisted(() => ({ calls: [] as unknown[] }));

// En Jaén solo se ofrece Endodoncia (no Ortodoncia ni Odontología General).
vi.mock('../../hooks/useBookingOffer', () => ({
  useBranchSpecialties: (branchId: string) => {
    offer.calls.push(branchId);
    return {
      data: [{ id: 'endo', name: 'Endodoncia', description: 'Tratamiento de conductos' }],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    };
  },
}));

function renderStep() {
  render(<AttentionStep branchId="jaen" specialtyId={null} motiveLabel={null} onChange={vi.fn()} onContinue={vi.fn()} />);
  return userEvent.setup();
}

describe('AttentionStep', () => {
  it('solo muestra las especialidades de la sede elegida', async () => {
    const user = renderStep();

    await user.click(screen.getByText('Sé qué especialidad necesito'));

    expect(offer.calls).toContain('jaen');
    expect(screen.getByText('Endodoncia')).toBeInTheDocument();
    expect(screen.queryByText('Ortodoncia')).not.toBeInTheDocument();
  });

  it('la recomendación por motivo solo sugiere especialidades de la sede', async () => {
    const user = renderStep();

    await user.click(screen.getByText('Ayúdame a elegir'));
    await user.click(screen.getByText('Quiero corregir la posición de mis dientes'));

    // Ortodoncia y Odontología General no están en Jaén.
    expect(screen.getByText('No hay una especialidad recomendada disponible en esta sede')).toBeInTheDocument();
  });

  it('con dolor recomienda Endodoncia, que sí está en la sede', async () => {
    const user = renderStep();

    await user.click(screen.getByText('Ayúdame a elegir'));
    await user.click(screen.getByText('Tengo dolor o sensibilidad'));

    expect(screen.getByText('Te recomendamos comenzar con')).toBeInTheDocument();
    expect(screen.getByText('Endodoncia')).toBeInTheDocument();
  });
});
