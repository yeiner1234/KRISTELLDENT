import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import MyPatientsReportPage from './MyPatientsReportPage';
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
  reason: '',
  serviceName: 'Endodoncia',
  ...overrides,
});

vi.mock('../../utils/date', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../utils/date')>()),
  getTodayIsoDate: () => '2026-10-14',
  getLimaNowTime: () => '07:00',
}));
vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'd1', name: 'Rosa Vela Díaz', email: 'r@kd.pe', role: 'odontologa_general' } }),
}));
vi.mock('../../hooks/useMyReportProfile', () => ({ useMyReportProfile: () => ({ specialtyName: null }) }));
vi.mock('../../hooks/useAppointments', () => ({
  useMyAppointments: () => ({
    appointments: [
      appointment({ patientId: 'pt1', date: '2026-08-10' }),
      appointment({ patientId: 'pt1', date: '2026-10-20', status: 'confirmed' }),
      appointment({ patientId: 'pt2', date: '2026-09-02', serviceName: 'Curación con resina' }),
    ],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));
vi.mock('../../hooks/usePatients', () => ({
  useAllPatients: () => ({
    patients: [
      { id: 'pt1', dni: '46831572', firstName: 'Sofía', lastName: 'Guevara Núñez', phone: null, email: null },
      { id: 'pt2', dni: '43906715', firstName: 'Fabián', lastName: 'Olano Ruiz', phone: null, email: null },
    ],
    isLoading: false,
    error: null,
  }),
}));
vi.mock('../../hooks/useBranches', () => ({
  useBranches: () => ({ branches: [], isLoading: false, error: null }),
}));
vi.mock('../../services/reportService', () => ({
  // pt1 ya venía a la clínica; pt2 es nueva.
  getMyPatientsFirstVisit: vi.fn().mockResolvedValue(
    new Map([
      ['pt1', '2024-03-12'],
      ['pt2', '2026-09-02'],
    ]),
  ),
}));

function renderPage() {
  render(
    <MemoryRouter>
      <MyPatientsReportPage />
    </MemoryRouter>,
  );
}

describe('MyPatientsReportPage', () => {
  it('lista sus pacientes con su tipo y marca a quien no tiene próxima cita', async () => {
    renderPage();

    expect(await screen.findByRole('heading', { name: 'Reporte de mis pacientes' })).toBeInTheDocument();
    expect(screen.getByText('Odontóloga general')).toBeInTheDocument();

    const rows = within(screen.getByRole('table')).getAllByRole('row').slice(1);
    expect(rows).toHaveLength(2);
    expect(within(rows[0]).getByText('Olano Ruiz, Fabián')).toBeInTheDocument();
    expect(within(rows[0]).getByText('Nuevo')).toBeInTheDocument();
    expect(within(rows[0]).getByText('—')).toBeInTheDocument();
    expect(within(rows[1]).getByText('Recurrente')).toBeInTheDocument();
    expect(within(rows[1]).getByText('20/10/2026')).toBeInTheDocument();
    // El nombre abre su historia.
    expect(within(rows[1]).getByRole('link', { name: 'Guevara Núñez, Sofía' })).toHaveAttribute(
      'href',
      '/profesional/reportes/historia?paciente=pt1',
    );
  });

  it('filtra por tipo de paciente', async () => {
    renderPage();
    await screen.findByRole('heading', { name: 'Reporte de mis pacientes' });

    await userEvent.selectOptions(screen.getByLabelText('Tipo de paciente'), 'new');

    const rows = within(screen.getByRole('table')).getAllByRole('row').slice(1);
    expect(rows).toHaveLength(1);
    expect(within(rows[0]).getByText('Olano Ruiz, Fabián')).toBeInTheDocument();
  });
});
