import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BranchPatientsPage from './BranchPatientsPage';
import type { Appointment } from '../../types/Appointment';
import { PanelBranchContext, type PanelBranchContextValue } from '../../context/panelBranchContext';

const appointment = (overrides: Partial<Appointment>): Appointment => ({
  id: 'a1',
  code: 'KD-AAA111',
  patientId: 'pt1',
  professionalId: 'p1',
  branchId: 'b1',
  serviceId: null,
  date: '2026-11-16',
  startTime: '09:00',
  endTime: '09:30',
  status: 'pending',
  reason: '',
  ...overrides,
});

vi.mock('../../hooks/useAppointments', () => ({
  useAllAppointments: () => ({
    appointments: [
      appointment({ id: 'a1', date: '2026-11-25', startTime: '10:30', serviceName: 'Limpieza', reason: 'Sangrado de encías' }),
      appointment({ id: 'a3', date: '2026-10-01', status: 'completed', serviceName: 'Resina' }),
      appointment({ id: 'a2', patientId: 'pt2', branchId: 'b2', date: '2026-12-01', status: 'confirmed' }),
    ],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));
vi.mock('../../utils/date', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../utils/date')>()),
  getTodayIsoDate: () => '2026-11-25',
}));
vi.mock('../../hooks/useProfessionals', () => ({
  useProfessionals: () => ({
    professionals: [
      {
        id: 'p1',
        fullName: 'Dra. Kristell',
        role: null,
        bio: null,
        avatarPath: null,
        active: true,
        specialtyIds: [],
        branchIds: [],
        serviceIds: [],
      },
    ],
    isLoading: false,
    error: null,
  }),
}));
vi.mock('../../hooks/useServices', () => ({
  useServices: () => ({ services: [], isLoading: false, error: null }),
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

function renderPage(selectedBranchId: string) {
  const value: PanelBranchContextValue = {
    branches: [
      { id: 'b1', name: 'Bagua' },
      { id: 'b2', name: 'Jaén' },
    ],
    selectedBranchId,
    setSelectedBranchId: vi.fn(),
    branchName: (id) => (id === 'b1' ? 'Bagua' : 'Jaén'),
    isLoading: false,
    inPanel: true,
  };
  render(
    <PanelBranchContext.Provider value={value}>
      <BranchPatientsPage />
    </PanelBranchContext.Provider>,
  );
}

describe('BranchPatientsPage (técnica)', () => {
  it('muestra solo los pacientes con citas en la sede elegida', () => {
    renderPage('b1');

    expect(screen.getByText(/Ana/)).toBeInTheDocument();
    expect(screen.queryByText(/Luis/)).not.toBeInTheDocument();
  });

  it('con todas sus sedes, busca por DNI', async () => {
    renderPage('');
    expect(screen.getByText(/Luis/)).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('Buscar pacientes'), '8765');

    expect(screen.getByText(/Luis/)).toBeInTheDocument();
    expect(screen.queryByText(/Ana/)).not.toBeInTheDocument();
  });

  it('muestra la cita de hoy, la última visita y filtra por "con cita hoy"', async () => {
    renderPage('');
    const row = screen.getByRole('button', { name: 'Ver ficha de Ana Ríos' });
    expect(within(row).getByText('Hoy · 10:30')).toBeInTheDocument();
    expect(within(row).getByText(/Resina/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('tab', { name: /Con cita hoy/ }));

    expect(screen.getByText(/Ana/)).toBeInTheDocument();
    expect(screen.queryByText(/Luis/)).not.toBeInTheDocument();
  });

  it('abre la ficha con el motivo, los servicios y el historial', async () => {
    renderPage('b1');

    await userEvent.click(screen.getByRole('button', { name: 'Ver ficha de Ana Ríos' }));

    const dialog = await screen.findByRole('dialog', { name: 'Ana Ríos' });
    expect(within(dialog).getByText('Sangrado de encías')).toBeInTheDocument();
    expect(within(dialog).getByText('Todas sus citas (2)')).toBeInTheDocument();
    expect(within(dialog).getAllByText('Dra. Kristell').length).toBeGreaterThan(0);
  });
});
