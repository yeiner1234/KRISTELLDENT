import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import MyPatientsPage from './MyPatientsPage';
import { PanelBranchContext, type PanelBranchContextValue } from '../../context/panelBranchContext';
import type { Appointment } from '../../types/Appointment';

const appointment = (id: string, patientId: string, branchId: string): Appointment => ({
  id,
  code: id,
  patientId,
  professionalId: 'ana',
  branchId,
  serviceId: null,
  date: '2026-11-23',
  startTime: '09:00',
  endTime: '09:30',
  status: 'completed',
  reason: '',
});

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'ana', name: 'ANali', email: 'a@k.pe', role: 'especialista' } }),
}));
vi.mock('../../hooks/useAppointments', () => ({
  useMyAppointments: () => ({
    appointments: [appointment('a1', 'pt1', 'bagua'), appointment('a2', 'pt2', 'jaen')],
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

function renderWithBranch(selectedBranchId: string) {
  const value: PanelBranchContextValue = {
    branches: [
      { id: 'bagua', name: 'Bagua' },
      { id: 'jaen', name: 'Jaén' },
    ],
    selectedBranchId,
    setSelectedBranchId: vi.fn(),
    branchName: (id) => id,
    isLoading: false,
    inPanel: true,
  };
  render(
    <PanelBranchContext.Provider value={value}>
      <MyPatientsPage />
    </PanelBranchContext.Provider>,
  );
}

describe('MyPatientsPage — sede del panel', () => {
  it('con todas sus sedes muestra a todos sus pacientes', () => {
    renderWithBranch('');

    expect(screen.getByText('2 pacientes')).toBeInTheDocument();
  });

  it('con una sede elegida solo los pacientes con citas en ella', () => {
    renderWithBranch('jaen');

    expect(screen.getByText('1 paciente')).toBeInTheDocument();
    expect(screen.queryByText(/Ana/)).not.toBeInTheDocument();
  });
});
