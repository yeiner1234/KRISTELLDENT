import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AgendaReportPage from './AgendaReportPage';
import type { Appointment } from '../../types/Appointment';
import { PanelBranchContext, type PanelBranchContextValue } from '../../context/panelBranchContext';

const access = vi.hoisted(() => ({ branchIds: ['bagua'] }));

const appointment = (overrides: Partial<Appointment>): Appointment => ({
  id: 'a1',
  code: 'KD-AAA111',
  patientId: 'pt1',
  professionalId: 'p-mendoza',
  branchId: 'bagua',
  serviceId: 's1',
  date: '2026-10-15',
  startTime: '08:00',
  endTime: '08:30',
  status: 'confirmed',
  reason: '',
  ...overrides,
});

const professional = (id: string, fullName: string) => ({
  id,
  fullName,
  role: null,
  bio: null,
  active: true,
  specialtyIds: [],
  branchIds: ['bagua'],
  serviceIds: [],
});

vi.mock('../../utils/date', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../utils/date')>()),
  getTodayIsoDate: () => '2026-10-15',
}));
vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 't1', name: 'Yesenia Campos Ruiz', email: 't@kd.pe', role: 'tecnica' } }),
}));
vi.mock('../../hooks/useAppointments', () => ({
  useAllAppointments: () => ({
    appointments: [
      appointment({ id: 'a2', startTime: '08:30', professionalId: 'p-rojas', patientId: 'pt2', status: 'pending' }),
      appointment({ id: 'a1' }),
      appointment({ id: 'a3', startTime: '15:00', professionalId: 'p-rojas', status: 'cancelled' }),
      appointment({ id: 'a4', startTime: '09:00', branchId: 'jaen' }),
    ],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));
vi.mock('../../hooks/usePatients', () => ({
  useAllPatients: () => ({
    patients: [
      { id: 'pt1', dni: '12345678', firstName: 'Álvaro', lastName: 'Chumpitaz Rey', phone: null, email: null },
      { id: 'pt2', dni: '87654321', firstName: 'Teresa', lastName: 'Huamán Cubas', phone: null, email: null },
    ],
    isLoading: false,
    error: null,
  }),
}));
vi.mock('../../hooks/useProfessionals', () => ({
  useProfessionals: () => ({
    professionals: [professional('p-mendoza', 'Lucía Mendoza Paz'), professional('p-rojas', 'María Rojas Díaz')],
    isLoading: false,
    error: null,
  }),
}));
vi.mock('../../hooks/useServices', () => ({
  useServices: () => ({ services: [{ id: 's1', name: 'Extracción simple' }], isLoading: false, error: null }),
}));
vi.mock('../../hooks/useBranches', () => ({
  useBranches: () => ({
    branches: [
      { id: 'bagua', name: 'Bagua', address: 'Comercio N.º 367', active: true },
      { id: 'jaen', name: 'Jaén', address: 'Mesones Muro 120', active: true },
    ],
    isLoading: false,
    error: null,
  }),
}));
vi.mock('../../hooks/useManageableBranchIds', () => ({
  useManageableBranchIds: () => ({ branchIds: access.branchIds, isLoading: false, error: null }),
}));
vi.mock('../../hooks/useBranchWeeklyHours', () => ({
  useBranchWeeklyHours: () => ({ hours: { thu: { open: '08:00', close: '18:00' } }, isLoading: false, error: null }),
}));

function tableRows() {
  return within(screen.getByRole('table')).getAllByRole('row').slice(1);
}

describe('AgendaReportPage', () => {
  it('la técnica solo puede elegir su sede', () => {
    render(<AgendaReportPage />);

    const branchSelect = screen.getByLabelText('Sede');
    expect(within(branchSelect).getAllByRole('option').map((option) => option.textContent)).toEqual(['Bagua']);
  });

  it('muestra la hoja con el código, la fecha y las citas pendientes y confirmadas en orden', () => {
    render(<AgendaReportPage />);

    expect(screen.getByRole('heading', { name: 'Agenda de citas de la sede' })).toBeInTheDocument();
    expect(screen.getByText('AGE-BAG-2026-1015')).toBeInTheDocument();
    expect(screen.getByText('Jueves 15 oct 2026')).toBeInTheDocument();
    expect(screen.getByText('Sede Bagua · 08:00 – 18:00')).toBeInTheDocument();
    expect(screen.getByText('Técnica')).toBeInTheDocument();
    expect(screen.getByText('Yesenia Campos Ruiz')).toBeInTheDocument();
    expect(screen.getByText('Todas (2)')).toBeInTheDocument();
    expect(screen.getByText('Mendoza · Rojas')).toBeInTheDocument();

    const rows = tableRows();
    expect(rows).toHaveLength(2);
    expect(within(rows[0]).getByText('Chumpitaz Rey, Álvaro')).toBeInTheDocument();
    expect(within(rows[0]).getByText('Dra. L. Mendoza Paz')).toBeInTheDocument();
    expect(within(rows[0]).getByText('LM')).toBeInTheDocument();
    expect(within(rows[1]).getByText('Pendiente')).toBeInTheDocument();
  });

  it('al elegir "Todas" aparecen las canceladas y otra fecha sin citas muestra el aviso', async () => {
    const user = userEvent.setup();
    render(<AgendaReportPage />);

    await user.selectOptions(screen.getByLabelText('Estado'), 'all');
    expect(tableRows()).toHaveLength(3);
    expect(within(tableRows()[2]).getByText('Cancelada')).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Turno'), 'morning');
    expect(tableRows()).toHaveLength(2);

    const dateInput = screen.getByLabelText('Fecha');
    fireEvent.change(dateInput, { target: { value: '2026-10-16' } });
    expect(screen.getByText('No hay citas programadas para este día.')).toBeInTheDocument();
    expect(screen.getByText('AGE-BAG-2026-1016')).toBeInTheDocument();

    // Borrar la fecha no deja la hoja sin fecha.
    fireEvent.change(dateInput, { target: { value: '' } });
    expect(screen.getByText('Viernes 16 oct 2026')).toBeInTheDocument();
  });
});

describe('AgendaReportPage — en el panel profesional', () => {
  afterEach(() => {
    access.branchIds = ['bagua'];
  });

  it('su selector "Sede" es el del panel: abre en la sede elegida y al cambiarlo cambia el del panel', async () => {
    access.branchIds = ['bagua', 'jaen'];
    const setSelectedBranchId = vi.fn();
    const value: PanelBranchContextValue = {
      branches: [
        { id: 'bagua', name: 'Bagua' },
        { id: 'jaen', name: 'Jaén' },
      ],
      selectedBranchId: 'jaen',
      setSelectedBranchId,
      branchName: (id) => id,
      isLoading: false,
      inPanel: true,
    };
    const user = userEvent.setup();
    render(
      <PanelBranchContext.Provider value={value}>
        <AgendaReportPage />
      </PanelBranchContext.Provider>,
    );

    expect(screen.getByLabelText('Sede')).toHaveValue('jaen');
    expect(screen.getByText('AGE-JAE-2026-1015')).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Sede'), 'bagua');
    expect(setSelectedBranchId).toHaveBeenCalledWith('bagua');
  });
});
