import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import AppointmentsPage from './AppointmentsPage';
import { setAppointmentStatus } from '../../services/appointmentService';
import type { Appointment } from '../../types/Appointment';

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
  status: 'confirmed',
  reason: '',
  ...overrides,
});

const appointments = [
  appointment({ id: 'a1' }),
  appointment({ id: 'a2', code: 'KD-BBB222', date: '2026-11-17', patientId: 'pt2' }),
  appointment({ id: 'a3', code: 'KD-CCC333', startTime: '11:00', status: 'in_room', patientId: 'pt2', professionalId: 'p2' }),
];

vi.mock('../../utils/date', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../utils/date')>()),
  getTodayIsoDate: () => '2026-11-16',
}));
vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'u1', name: 'Admin', email: 'a@b.pe', role: 'admin_sede' } }),
}));
vi.mock('../../hooks/useAppointments', () => ({
  useAllAppointments: () => ({ appointments, isLoading: false, error: null, refetch }),
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
      { id: 'p2', fullName: 'Dra. Soto', role: 'especialista', bio: null, active: false, specialtyIds: [], branchIds: ['b1'], serviceIds: [] },
    ],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));
vi.mock('../../hooks/useProfessionals', () => ({ useProfessionals: () => ({ professionals: [], isLoading: false }) }));
vi.mock('../../hooks/useAdminBranches', () => ({
  useAdminBranches: () => ({
    branches: [{ id: 'b1', name: 'KristellDent Jaen', active: true }],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));
vi.mock('../../hooks/useManageableBranchIds', () => ({
  useManageableBranchIds: () => ({ branchIds: ['b1'], isLoading: false, error: null }),
}));
vi.mock('../../hooks/useAdminServices', () => ({
  useAdminServices: () => ({
    services: [{ id: 's1', name: 'Limpieza', specialtyId: 'x', duration: 30, price: 0, active: true }],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));
vi.mock('../../hooks/useServices', () => ({ useServices: () => ({ services: [], isLoading: false }) }));
vi.mock('../../services/appointmentService', () => ({
  setAppointmentStatus: vi.fn(),
  rescheduleAppointment: vi.fn(),
  getAvailableSlots: vi.fn().mockResolvedValue([]),
  createPublicAppointment: vi.fn(),
}));

function renderPage() {
  render(
    <MemoryRouter>
      <AppointmentsPage />
    </MemoryRouter>,
  );
}

function rowOf(code: string) {
  return screen.getByText(code).closest('[data-appointment-row]') as HTMLElement;
}

describe('AppointmentsPage (admin)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('abre en las citas de hoy con hora, código, paciente, DNI, profesional y servicio', () => {
    renderPage();

    expect(screen.getByText('KD-AAA111')).toBeInTheDocument();
    expect(screen.getByText('KD-CCC333')).toBeInTheDocument();
    expect(screen.queryByText('KD-BBB222')).not.toBeInTheDocument();

    const row = rowOf('KD-AAA111');
    expect(within(row).getByText('Ana Ríos')).toBeInTheDocument();
    expect(within(row).getByText('DNI 12345678')).toBeInTheDocument();
    expect(within(row).getByText('Dra. Vega')).toBeInTheDocument();
    expect(within(row).getByText('Limpieza')).toBeInTheDocument();
    // Profesional inactiva: su nombre se ve igual.
    expect(within(rowOf('KD-CCC333')).getByText('Dra. Soto')).toBeInTheDocument();
  });

  it('el detalle de la cita muestra su sede', async () => {
    renderPage();

    await userEvent.click(within(rowOf('KD-AAA111')).getByRole('button', { name: 'Ver detalle de la cita' }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Sede')).toBeInTheDocument();
    expect(within(dialog).getByText('KristellDent Jaen')).toBeInTheDocument();
  });

  it('filtra por estado En sala', async () => {
    renderPage();

    expect(screen.getByRole('tab', { name: /En sala/ })).toHaveTextContent('1');
    await userEvent.click(screen.getByRole('tab', { name: /En sala/ }));

    expect(screen.queryByText('KD-AAA111')).not.toBeInTheDocument();
    expect(screen.getByText('KD-CCC333')).toBeInTheDocument();
  });

  it('muestra solo las acciones que permite el estado', () => {
    renderPage();

    const confirmed = rowOf('KD-AAA111');
    expect(within(confirmed).getByRole('button', { name: 'Marcar llegada' })).toBeInTheDocument();
    expect(within(confirmed).queryByRole('button', { name: 'Confirmar' })).not.toBeInTheDocument();

    const inRoom = rowOf('KD-CCC333');
    expect(within(inRoom).getByRole('button', { name: 'Marcar como atendida' })).toBeInTheDocument();
    expect(within(inRoom).queryByRole('button', { name: 'Reprogramar' })).not.toBeInTheDocument();
  });

  it('Marcar llegada pasa la cita a En sala y recarga la lista', async () => {
    vi.mocked(setAppointmentStatus).mockResolvedValue();
    renderPage();

    await userEvent.click(within(rowOf('KD-AAA111')).getByRole('button', { name: 'Marcar llegada' }));

    expect(setAppointmentStatus).toHaveBeenCalledWith('a1', 'in_room');
    expect(refetch).toHaveBeenCalled();
  });

  it('si el servidor rechaza el cambio, muestra su mensaje y el botón sigue activo', async () => {
    vi.mocked(setAppointmentStatus).mockRejectedValue(new Error('Una cita completada no puede pasar a en sala.'));
    renderPage();

    const button = within(rowOf('KD-AAA111')).getByRole('button', { name: 'Marcar llegada' });
    await userEvent.click(button);

    expect(await screen.findByText('Una cita completada no puede pasar a en sala.')).toBeInTheDocument();
    expect(button).toBeEnabled();
  });
});
