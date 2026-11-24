import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BranchAgendaPage from './BranchAgendaPage';
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

vi.mock('../../utils/date', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../utils/date')>()),
  getTodayIsoDate: () => '2026-11-16',
}));
vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 't1', name: 'Técnica', email: 't@b.pe', role: 'tecnica' } }),
}));
vi.mock('../../hooks/useAppointments', () => ({
  useAllAppointments: () => ({
    appointments: [
      appointment({ id: 'a1' }),
      appointment({ id: 'a2', code: 'KD-BBB222', patientId: 'pt2', branchId: 'b2', startTime: '10:00', endTime: '10:30' }),
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
vi.mock('../../hooks/useProfessionals', () => ({
  useProfessionals: () => ({
    professionals: [
      { id: 'p1', fullName: 'Dra. Vega', role: null, bio: null, active: true, specialtyIds: [], branchIds: [], serviceIds: [] },
    ],
    isLoading: false,
  }),
}));
vi.mock('../../hooks/useServices', () => ({ useServices: () => ({ services: [], isLoading: false }) }));
vi.mock('../../services/appointmentService', () => ({ setAppointmentStatus: vi.fn() }));

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
      <BranchAgendaPage />
    </PanelBranchContext.Provider>,
  );
}

describe('BranchAgendaPage (técnica)', () => {
  it('muestra en la semana solo las citas de la sede elegida', () => {
    renderPage('b1');

    expect(screen.getByText('Ana Ríos')).toBeInTheDocument();
    expect(screen.queryByText('Luis Paz')).not.toBeInTheDocument();
  });

  it('abre el detalle con la sede y solo ofrece Marcar llegada', async () => {
    renderPage('');

    await userEvent.click(screen.getByText('Ana Ríos'));

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('Bagua');
    expect(screen.getByRole('button', { name: 'Marcar llegada' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reprogramar' })).not.toBeInTheDocument();
  });
});
