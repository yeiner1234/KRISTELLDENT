import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MyAppointmentsPage from './MyAppointmentsPage';
import type { Appointment } from '../../types/Appointment';

const appointment = (overrides: Partial<Appointment>): Appointment => ({
  id: 'a1',
  code: 'KD-AAA111',
  patientId: 'pt1',
  professionalId: 'ana',
  branchId: 'b1',
  serviceId: null,
  serviceName: 'Limpieza',
  date: '2026-11-25',
  startTime: '09:00',
  endTime: '09:30',
  status: 'confirmed',
  reason: '',
  ...overrides,
});

vi.mock('../../utils/date', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../utils/date')>()),
  getTodayIsoDate: () => '2026-11-25',
}));
vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'ana', name: 'Ana', email: 'a@k.pe', role: 'especialista' } }),
}));
vi.mock('../../hooks/useAppointments', () => ({
  useMyAppointments: () => ({
    appointments: [
      appointment({ id: 'a1', code: 'KD-HOY111' }),
      appointment({ id: 'a2', code: 'KD-MAN222', date: '2026-11-26', status: 'pending' }),
      appointment({ id: 'a3', code: 'KD-PAS333', date: '2026-11-10', status: 'completed' }),
    ],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));
vi.mock('../../hooks/usePatients', () => ({
  useAllPatients: () => ({
    patients: [{ id: 'pt1', dni: '12345678', firstName: 'Luis', lastName: 'Paz', phone: null, email: null }],
    isLoading: false,
    error: null,
  }),
}));
vi.mock('../../hooks/useServices', () => ({
  useServices: () => ({ services: [], isLoading: false, error: null }),
}));

describe('MyAppointmentsPage', () => {
  it('abre en las próximas, agrupadas por día', () => {
    render(<MyAppointmentsPage />);

    expect(screen.getByText('KD-HOY111')).toBeInTheDocument();
    expect(screen.getByText('KD-MAN222')).toBeInTheDocument();
    expect(screen.queryByText('KD-PAS333')).not.toBeInTheDocument();
    expect(screen.getByText('Hoy')).toBeInTheDocument();
    expect(screen.getByText('Mañana')).toBeInTheDocument();
  });

  it('filtra por estado y muestra el historial', async () => {
    render(<MyAppointmentsPage />);

    await userEvent.click(screen.getByRole('tab', { name: /Pendiente/ }));
    expect(screen.queryByText('KD-HOY111')).not.toBeInTheDocument();
    expect(screen.getByText('KD-MAN222')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('tab', { name: 'Historial' }));
    await userEvent.click(screen.getByRole('tab', { name: /Todas/ }));
    expect(screen.getByText('KD-PAS333')).toBeInTheDocument();
    expect(screen.queryByText('KD-HOY111')).not.toBeInTheDocument();
  });
});
