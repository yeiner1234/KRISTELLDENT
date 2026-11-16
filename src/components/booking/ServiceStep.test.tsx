import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ServiceStep from './ServiceStep';
import type { Professional } from '../../types/Professional';

const ana: Professional = {
  id: 'ana',
  fullName: 'Ana Ríos',
  role: null,
  bio: null,
  active: true,
  specialtyIds: ['endo'],
  branchIds: ['chacha'],
  serviceIds: [],
};

vi.mock('../../hooks/useProfessionals', () => ({
  useProfessionals: () => ({ professionals: [ana], isLoading: false, error: null }),
}));
vi.mock('../../hooks/useServices', () => ({
  useServices: () => ({ services: [], isLoading: false, error: null }),
}));

describe('ServiceStep', () => {
  it('sin profesionales de la especialidad en la sede lo dice así', () => {
    render(<ServiceStep specialtyId="endo" branchId="chiclayo" professionalId="any" serviceId={null} onChange={vi.fn()} />);

    expect(screen.getByText('No hay profesionales de esta especialidad en esta sede.')).toBeInTheDocument();
  });

  it('con profesionales pero sin servicios mantiene el mensaje de servicios', () => {
    render(<ServiceStep specialtyId="endo" branchId="chacha" professionalId="any" serviceId={null} onChange={vi.fn()} />);

    expect(screen.getByText('No hay servicios disponibles')).toBeInTheDocument();
  });
});
