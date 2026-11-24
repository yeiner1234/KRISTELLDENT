import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProfessionalStep from './ProfessionalStep';

const offer = vi.hoisted(() => ({ calls: [] as unknown[][] }));

vi.mock('../../hooks/useBookingOffer', () => ({
  useBookableProfessionals: (...args: unknown[]) => {
    offer.calls.push(args);
    return { data: [{ id: 'ana', fullName: 'ANali' }], isLoading: false, error: null, refetch: vi.fn() };
  },
  useBranchSpecialties: () => ({
    data: [{ id: 'endo', name: 'Endodoncia', description: null }],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

describe('ProfessionalStep', () => {
  it('lista solo a quien atiende algo reservable de esa especialidad en la sede', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ProfessionalStep specialtyId="endo" branchId="jaen" professionalId={null} onChange={onChange} />);

    await user.click(screen.getByText('Elegir profesional'));
    await user.click(screen.getByText('ANali'));

    expect(offer.calls[0]).toEqual(['jaen', 'endo']);
    expect(onChange).toHaveBeenCalledWith('ana');
  });
});
