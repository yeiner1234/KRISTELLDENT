import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import MyAppointmentsReportPage from './MyAppointmentsReportPage';
import type { Appointment } from '../../types/Appointment';

const appointment = (overrides: Partial<Appointment>): Appointment => ({
  id: Math.random().toString(36).slice(2),
  code: 'KD-1',
  patientId: 'pt1',
  professionalId: 'd1',
  branchId: 'bagua',
  serviceId: 's1',
  date: '2026-08-10',
  startTime: '08:30',
  endTime: '09:00',
  status: 'completed',
  reason: 'Control',
  serviceName: 'Endodoncia',
  ...overrides,
});

vi.mock('../../utils/date', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../utils/date')>()),
  getTodayIsoDate: () => '2026-10-14',
  getLimaNowTime: () => '07:00',
}));
vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'd1', name: 'Lucía Mendoza Paz', email: 'l@kd.pe', role: 'especialista' } }),
}));
vi.mock('../../hooks/useMyReportProfile', () => ({ useMyReportProfile: () => ({ specialtyName: 'Endodoncia' }) }));
vi.mock('../../hooks/useAppointments', () => ({
  useMyAppointments: () => ({
    appointments: [
      appointment({ date: '2026-08-10' }),
      appointment({ date: '2026-09-02' }),
      appointment({ date: '2026-09-03', status: 'cancelled', serviceName: 'Limpieza dental' }),
      appointment({ date: '2026-09-05', status: 'confirmed', patientId: 'pt2' }),
      appointment({ date: '2026-10-15', status: 'pending', reason: 'Dolor o sensibilidad' }),
    ],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));
vi.mock('../../hooks/usePatients', () => ({
  useAllPatients: () => ({
    patients: [
      { id: 'pt1', dni: '46831572', firstName: 'Teresa', lastName: 'Huamán Cubas', phone: null, email: null },
      { id: 'pt2', dni: '43906715', firstName: 'Fabián', lastName: 'Olano Ruiz', phone: null, email: null },
    ],
    isLoading: false,
    error: null,
  }),
}));
vi.mock('../../hooks/useBranches', () => ({
  useBranches: () => ({ branches: [{ id: 'bagua', name: 'Bagua', address: 'Comercio N.° 367' }], isLoading: false, error: null }),
}));
vi.mock('../../services/reportService', () => ({
  getBranchAttendance: vi.fn().mockResolvedValue({ completed: 9, cancelled: 1 }),
}));

function renderPage() {
  render(
    <MemoryRouter>
      <MyAppointmentsReportPage />
    </MemoryRouter>,
  );
}

describe('MyAppointmentsReportPage', () => {
  it('muestra la hoja con su resumen, la tasa frente a la sede y las citas sin cerrar', async () => {
    renderPage();

    expect(screen.getByRole('heading', { name: 'Reporte de mis citas' })).toBeInTheDocument();
    expect(screen.getByText('REP-CIT-LM-2026-1014')).toBeInTheDocument();
    expect(screen.getByText('Especialista · Endodoncia')).toBeInTheDocument();
    expect(screen.getByText('01 ago – 14 oct 2026')).toBeInTheDocument();
    // 2 atendidas, 1 cancelada → 66.7 %; la sede: 9 ÷ 10.
    expect(screen.getByText('66.7 %')).toBeInTheDocument();
    expect(await screen.findByText('sede: 90.0 %')).toBeInTheDocument();

    const unclosed = screen.getAllByRole('table')[0];
    expect(within(unclosed).getByText('Olano Ruiz, Fabián')).toBeInTheDocument();
    expect(within(unclosed).getByText('39 días')).toBeInTheDocument();

    const upcoming = screen.getAllByRole('table')[1];
    expect(within(upcoming).getByText('Dolor o sensibilidad')).toBeInTheDocument();
  });

  it('el filtro de servicio recalcula el resumen', async () => {
    renderPage();

    await userEvent.selectOptions(screen.getByLabelText('Servicio'), 'Limpieza dental');

    expect(screen.getByText('0.0 %')).toBeInTheDocument();
    expect(within(screen.getAllByRole('table')[0]).getByText(/tienen estado final/)).toBeInTheDocument();
  });
});
