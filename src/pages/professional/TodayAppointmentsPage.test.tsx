import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TodayAppointmentsPage from './TodayAppointmentsPage';
import { setAppointmentStatus } from '../../services/appointmentService';
import type { Appointment } from '../../types/Appointment';
import { PanelBranchContext, type PanelBranchContextValue } from '../../context/panelBranchContext';

const refetch = vi.fn();

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
      appointment({ id: 'a3', code: 'KD-CCC333', startTime: '11:00', status: 'confirmed' }),
      appointment({ id: 'a1' }),
      appointment({ id: 'a2', code: 'KD-BBB222', startTime: '10:00', status: 'in_room' }),
      appointment({ id: 'a4', code: 'KD-DDD444', startTime: '12:00', status: 'cancelled' }),
      appointment({ id: 'a5', code: 'KD-EEE555', date: '2026-11-17' }),
    ],
    isLoading: false,
    error: null,
    refetch,
  }),
}));
vi.mock('../../hooks/usePatients', () => ({
  useAllPatients: () => ({
    patients: [{ id: 'pt1', dni: '12345678', firstName: 'Ana', lastName: 'Ríos', phone: null, email: null }],
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

function rowOf(code: string) {
  return screen.getByText(code).closest('[data-testid="today-appointment"]') as HTMLElement;
}

describe('TodayAppointmentsPage (técnica)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('muestra solo las citas de hoy ordenadas por hora', () => {
    render(<TodayAppointmentsPage />);

    const codes = screen.getAllByTestId('today-appointment').map((row) => within(row).getByText(/^KD-/).textContent);
    expect(codes).toEqual(['KD-AAA111', 'KD-BBB222', 'KD-CCC333', 'KD-DDD444']);
    expect(within(rowOf('KD-AAA111')).getByText('Ana Ríos')).toBeInTheDocument();
    expect(within(rowOf('KD-AAA111')).getByText('Dra. Vega')).toBeInTheDocument();
  });

  it('ofrece Marcar llegada solo en citas pendientes o confirmadas, sin reprogramar ni atender', () => {
    render(<TodayAppointmentsPage />);

    expect(within(rowOf('KD-AAA111')).getByRole('button', { name: 'Marcar llegada' })).toBeInTheDocument();
    expect(within(rowOf('KD-CCC333')).getByRole('button', { name: 'Marcar llegada' })).toBeInTheDocument();
    expect(within(rowOf('KD-BBB222')).queryByRole('button', { name: 'Marcar llegada' })).not.toBeInTheDocument();
    expect(within(rowOf('KD-DDD444')).queryByRole('button', { name: 'Marcar llegada' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reprogramar' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Marcar como atendida' })).not.toBeInTheDocument();
  });

  it('Marcar llegada pasa la cita a En sala y actualiza la lista', async () => {
    vi.mocked(setAppointmentStatus).mockResolvedValue();
    render(<TodayAppointmentsPage />);

    await userEvent.click(within(rowOf('KD-AAA111')).getByRole('button', { name: 'Marcar llegada' }));

    expect(setAppointmentStatus).toHaveBeenCalledWith('a1', 'in_room');
    expect(refetch).toHaveBeenCalled();
  });

  it('si falla, muestra el mensaje del servidor', async () => {
    vi.mocked(setAppointmentStatus).mockRejectedValue(new Error('Una cita cancelada no puede pasar a en sala.'));
    render(<TodayAppointmentsPage />);

    await userEvent.click(within(rowOf('KD-AAA111')).getByRole('button', { name: 'Marcar llegada' }));

    expect(await screen.findByText('Una cita cancelada no puede pasar a en sala.')).toBeInTheDocument();
  });
});

describe('TodayAppointmentsPage — sede del panel', () => {
  const renderWithBranch = (selectedBranchId: string) => {
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
        <TodayAppointmentsPage />
      </PanelBranchContext.Provider>,
    );
  };

  it('muestra la sede de cada cita', () => {
    renderWithBranch('b1');

    expect(within(rowOf('KD-AAA111')).getByLabelText('Sede: Bagua')).toBeInTheDocument();
    expect(screen.getAllByTestId('today-appointment')).toHaveLength(4);
  });

  it('con otra sede elegida no muestra las citas de Bagua', () => {
    renderWithBranch('b2');

    expect(screen.queryAllByTestId('today-appointment')).toHaveLength(0);
    expect(screen.getByText('Sin citas hoy')).toBeInTheDocument();
  });
});
