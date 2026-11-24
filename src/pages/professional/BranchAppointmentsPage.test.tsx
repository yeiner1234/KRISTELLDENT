import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BranchAppointmentsPage from './BranchAppointmentsPage';
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
  serviceId: 's1',
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
      appointment({ id: 'a2', code: 'KD-BBB222', startTime: '10:00', status: 'in_room', branchId: 'b2' }),
      appointment({ id: 'a3', code: 'KD-CCC333', date: '2026-11-17' }),
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
vi.mock('../../hooks/useServices', () => ({
  useServices: () => ({ services: [{ id: 's1', name: 'Extracción simple' }], isLoading: false }),
}));
vi.mock('../../services/appointmentService', () => ({ setAppointmentStatus: vi.fn() }));

function renderPage(selectedBranchId = '') {
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
      <BranchAppointmentsPage />
    </PanelBranchContext.Provider>,
  );
}

function rowOf(code: string) {
  return screen.getByText(code).closest('tr') as HTMLElement;
}

describe('BranchAppointmentsPage (técnica)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('muestra las citas del día con paciente, profesional, servicio y sede, sin "Nueva cita"', () => {
    renderPage();

    const row = rowOf('KD-AAA111');
    expect(within(row).getByText('Ana Ríos')).toBeInTheDocument();
    expect(within(row).getByText('DNI 12345678')).toBeInTheDocument();
    expect(within(row).getByText('Dra. Vega')).toBeInTheDocument();
    expect(within(row).getByText('Extracción simple')).toBeInTheDocument();
    expect(within(row).getByLabelText('Sede: Bagua')).toBeInTheDocument();
    expect(screen.queryByText('KD-CCC333')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Nueva cita' })).not.toBeInTheDocument();
  });

  it('con una sede elegida arriba, solo ve las citas de esa sede', () => {
    renderPage('b1');

    expect(screen.getByText('KD-AAA111')).toBeInTheDocument();
    expect(screen.queryByText('KD-BBB222')).not.toBeInTheDocument();
  });

  it('sin fecha ve las citas de otros días', async () => {
    renderPage();

    await userEvent.clear(screen.getByLabelText('Fecha'));

    expect(screen.getByText('KD-CCC333')).toBeInTheDocument();
  });

  it('solo ofrece Marcar llegada y la guarda', async () => {
    vi.mocked(setAppointmentStatus).mockResolvedValue();
    renderPage();

    expect(screen.queryByRole('button', { name: 'Marcar como atendida' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancelar' })).not.toBeInTheDocument();
    await userEvent.click(within(rowOf('KD-AAA111')).getByRole('button', { name: 'Marcar llegada' }));

    expect(setAppointmentStatus).toHaveBeenCalledWith('a1', 'in_room');
    expect(refetch).toHaveBeenCalled();
  });

  it('si Marcar llegada falla, muestra el mensaje del servidor', async () => {
    vi.mocked(setAppointmentStatus).mockRejectedValue(new Error('Una cita cancelada no puede pasar a en sala.'));
    renderPage();

    await userEvent.click(within(rowOf('KD-AAA111')).getByRole('button', { name: 'Marcar llegada' }));

    expect(await screen.findByText('Una cita cancelada no puede pasar a en sala.')).toBeInTheDocument();
  });
});
