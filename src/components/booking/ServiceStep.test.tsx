import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ServiceStep from './ServiceStep';
import type { Professional } from '../../types/Professional';
import type { Service } from '../../types/Service';

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

const mocks = vi.hoisted(() => ({ professionals: [] as Professional[], services: [] as Service[] }));

vi.mock('../../hooks/useProfessionals', () => ({
  useProfessionals: () => ({ professionals: mocks.professionals, isLoading: false, error: null }),
}));
vi.mock('../../hooks/useServices', () => ({
  useServices: () => ({ services: mocks.services, isLoading: false, error: null }),
}));

const service = (id: string, name: string, branchId: string): Service => ({
  id,
  name,
  specialtyId: 'endo',
  branchId,
  duration: 30,
  price: 80,
  active: true,
});

describe('ServiceStep', () => {
  it('sin profesionales de la especialidad en la sede lo dice así', () => {
    mocks.professionals = [ana];
    mocks.services = [];
    render(<ServiceStep specialtyId="endo" branchId="chiclayo" professionalId="any" serviceId={null} onChange={vi.fn()} />);

    expect(screen.getByText('No hay profesionales de esta especialidad en esta sede.')).toBeInTheDocument();
  });

  it('con profesionales pero sin servicios mantiene el mensaje de servicios', () => {
    mocks.professionals = [ana];
    mocks.services = [];
    render(<ServiceStep specialtyId="endo" branchId="chacha" professionalId="any" serviceId={null} onChange={vi.fn()} />);

    expect(screen.getByText('No hay servicios disponibles')).toBeInTheDocument();
  });

  it('solo muestra el servicio de la sede elegida aunque la profesional tenga la copia de otra sede', () => {
    mocks.professionals = [{ ...ana, branchIds: ['chacha', 'jaen'], serviceIds: ['conducto-chacha', 'conducto-jaen'] }];
    mocks.services = [service('conducto-chacha', 'Conducto', 'chacha'), service('conducto-jaen', 'Conducto', 'jaen')];
    render(<ServiceStep specialtyId="endo" branchId="jaen" professionalId="any" serviceId={null} onChange={vi.fn()} />);

    expect(screen.getAllByText('Conducto')).toHaveLength(1);
  });
});
