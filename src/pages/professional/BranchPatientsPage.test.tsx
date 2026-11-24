import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
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
    appointments: [appointment({ id: 'a1' }), appointment({ id: 'a2', patientId: 'pt2', branchId: 'b2' })],
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
});
