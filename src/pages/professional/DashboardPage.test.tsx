import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import DashboardPage from './DashboardPage';
import { PanelBranchContext, type PanelBranchContextValue } from '../../context/panelBranchContext';
import type { Appointment } from '../../types/Appointment';

const appointment = (overrides: Partial<Appointment>): Appointment => ({
  id: 'a1',
  code: 'KD-AAA111',
  patientId: 'pt1',
  professionalId: 'ana',
  branchId: 'bagua',
  serviceId: null,
  date: '2026-11-23',
  startTime: '09:00',
  endTime: '09:30',
  status: 'pending',
  reason: '',
  ...overrides,
});

vi.mock('../../utils/date', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../utils/date')>()),
  getTodayIsoDate: () => '2026-11-23',
}));
vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'ana', name: 'ANali', email: 'a@k.pe', role: 'especialista' } }),
}));
vi.mock('../../hooks/useAppointments', () => ({
  useMyAppointments: () => ({
    appointments: [
      appointment({ id: 'a1', patientId: 'pt1', branchId: 'bagua' }),
      appointment({ id: 'a2', patientId: 'pt2', branchId: 'jaen', startTime: '15:00', endTime: '15:30' }),
    ],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));
vi.mock('../../hooks/usePatients', () => ({
  useAllPatients: () => ({
    patients: [
      { id: 'pt1', dni: '11111111', firstName: 'Ana', lastName: 'Ríos', phone: null, email: null },
      { id: 'pt2', dni: '22222222', firstName: 'Bea', lastName: 'Soto', phone: null, email: null },
    ],
    isLoading: false,
    error: null,
  }),
}));

const names: Record<string, string> = { bagua: 'Bagua', jaen: 'Jaén' };

function renderWithBranch(selectedBranchId: string) {
  const value: PanelBranchContextValue = {
    branches: [
      { id: 'bagua', name: 'Bagua' },
      { id: 'jaen', name: 'Jaén' },
    ],
    selectedBranchId,
    setSelectedBranchId: vi.fn(),
    branchName: (id) => names[id] ?? '—',
    isLoading: false,
    inPanel: true,
  };
  return render(
    <PanelBranchContext.Provider value={value}>
      <DashboardPage />
    </PanelBranchContext.Provider>,
  );
}

describe('DashboardPage — sede', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('con todas sus sedes muestra la sede de cada cita', () => {
    renderWithBranch('');

    expect(screen.getAllByText('Ana Ríos').length).toBeGreaterThan(0);
    expect(screen.getByText('Bea Soto')).toBeInTheDocument();
    // La próxima cita también dice en qué sede es.
    expect(screen.getByText('09:00 · Consulta · Bagua')).toBeInTheDocument();
    expect(screen.getByLabelText('Sede: Bagua')).toBeInTheDocument();
    expect(screen.getByLabelText('Sede: Jaén')).toBeInTheDocument();
  });

  it('con una sede elegida solo muestra sus citas', () => {
    renderWithBranch('jaen');

    expect(screen.queryByText('Ana Ríos')).not.toBeInTheDocument();
    expect(screen.getAllByText('Bea Soto').length).toBeGreaterThan(0);
  });
});
