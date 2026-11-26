import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PatientsPage from './PatientsPage';
import type { Appointment } from '../../types/Appointment';

const appointment = (overrides: Partial<Appointment>): Appointment => ({
  id: 'a1',
  code: 'KD-AAA111',
  patientId: 'pt1',
  professionalId: 'p1',
  branchId: 'b1',
  serviceId: null,
  serviceName: 'Limpieza',
  date: '2026-11-25',
  startTime: '10:30',
  endTime: '11:00',
  status: 'pending',
  reason: '',
  ...overrides,
});

vi.mock('../../utils/date', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../utils/date')>()),
  getTodayIsoDate: () => '2026-11-25',
}));
vi.mock('../../hooks/useAppointments', () => ({
  useAllAppointments: () => ({
    appointments: [
      appointment({ id: 'a1' }),
      appointment({ id: 'a2', date: '2026-10-01', status: 'completed', serviceName: 'Resina' }),
    ],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));
vi.mock('../../hooks/usePatients', () => ({
  useAllPatients: () => ({
    patients: [
      { id: 'pt1', dni: '12345678', firstName: 'Ana', lastName: 'Ríos', phone: null, email: null },
      { id: 'pt2', dni: '87654321', firstName: 'Luis', lastName: 'Paz', phone: null, email: null },
    ],
    isLoading: false,
    error: null,
  }),
}));
vi.mock('../../hooks/useAdminProfessionals', () => ({
  useAdminProfessionals: () => ({
    professionals: [
      { id: 'p1', fullName: 'Dra. Vega', role: 'especialista', bio: null, active: true, specialtyIds: [], branchIds: ['b1'], serviceIds: [] },
    ],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));
vi.mock('../../hooks/useAdminServices', () => ({
  useAdminServices: () => ({ services: [], isLoading: false, error: null, refetch: vi.fn() }),
}));
vi.mock('../../hooks/useAdminBranches', () => ({
  useAdminBranches: () => ({
    branches: [{ id: 'b1', name: 'KristellDent Jaen', active: true }],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

describe('PatientsPage (admin)', () => {
  it('lista también a los pacientes sin citas y muestra el resumen', () => {
    render(<PatientsPage />);

    expect(screen.getByText('2 pacientes')).toBeInTheDocument();
    const ana = screen.getByRole('button', { name: 'Ver ficha de Ana Ríos' });
    expect(within(ana).getByText('Hoy · 10:30')).toBeInTheDocument();
    const luis = screen.getByRole('button', { name: 'Ver ficha de Luis Paz' });
    expect(within(luis).getByText('Sin cita programada')).toBeInTheDocument();
  });

  it('la ficha muestra la sede por su nombre', async () => {
    render(<PatientsPage />);

    await userEvent.click(screen.getByRole('button', { name: 'Ver ficha de Ana Ríos' }));

    const dialog = await screen.findByRole('dialog', { name: 'Ana Ríos' });
    expect(within(dialog).getAllByText(/KristellDent Jaen/).length).toBeGreaterThan(0);
  });
});
