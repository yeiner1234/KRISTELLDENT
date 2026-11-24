import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ServiceStep from './ServiceStep';
import type { BookableService } from '../../types/Offer';

const offer = vi.hoisted(() => ({ services: [] as BookableService[], calls: [] as unknown[][] }));

vi.mock('../../hooks/useBookingOffer', () => ({
  useBookableServices: (...args: unknown[]) => {
    offer.calls.push(args);
    return { data: offer.services, isLoading: false, error: null, refetch: vi.fn() };
  },
}));

describe('ServiceStep', () => {
  beforeEach(() => {
    offer.services = [];
    offer.calls = [];
  });

  it('pide los servicios reservables de la sede, de la profesional elegida', () => {
    render(<ServiceStep specialtyId="endo" branchId="jaen" professionalId="ana" serviceId={null} onChange={vi.fn()} />);

    expect(offer.calls[0]).toEqual(['jaen', 'endo', 'ana']);
  });

  it('con "cualquier profesional" pide los de todas las que atienden ahí', () => {
    render(<ServiceStep specialtyId="endo" branchId="jaen" professionalId="any" serviceId={null} onChange={vi.fn()} />);

    expect(offer.calls[0]).toEqual(['jaen', 'endo', null]);
  });

  it('muestra el precio y la duración de esa sede', () => {
    offer.services = [
      { id: 'c', name: 'Conducto', specialtyId: 'endo', specialtyName: 'Endodoncia', price: 150, duration: 60 },
    ];
    render(<ServiceStep specialtyId="endo" branchId="jaen" professionalId="any" serviceId={null} onChange={vi.fn()} />);

    expect(screen.getByText('Conducto')).toBeInTheDocument();
    expect(screen.getByText('60 min')).toBeInTheDocument();
    expect(screen.getByText(/150/)).toBeInTheDocument();
  });

  it('sin servicios lo dice', () => {
    render(<ServiceStep specialtyId="endo" branchId="jaen" professionalId="any" serviceId={null} onChange={vi.fn()} />);

    expect(screen.getByText('No hay servicios disponibles')).toBeInTheDocument();
  });
});
