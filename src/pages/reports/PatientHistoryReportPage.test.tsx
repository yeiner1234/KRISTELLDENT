import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import PatientHistoryReportPage from './PatientHistoryReportPage';
import { getPatientHistory, type PatientHistoryEntry } from '../../services/reportService';

const access = vi.hoisted(() => ({ role: 'especialista' }));

const entry = (overrides: Partial<PatientHistoryEntry>): PatientHistoryEntry => ({
  id: Math.random().toString(36).slice(2),
  date: '2026-09-18',
  startTime: '10:00',
  status: 'completed',
  reason: 'Dolor o sensibilidad',
  serviceId: 'endo',
  serviceName: 'Endodoncia',
  serviceSessions: 4,
  professionalId: 'd1',
  professionalName: 'Lucía Mendoza Paz',
  branchId: 'bagua',
  branchName: 'Bagua',
  ...overrides,
});

vi.mock('../../utils/date', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../utils/date')>()),
  getTodayIsoDate: () => '2026-10-14',
  getLimaNowTime: () => '07:00',
}));
vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'd1', name: 'Lucía Mendoza Paz', email: 'l@kd.pe', role: access.role } }),
}));
vi.mock('../../hooks/useMyReportProfile', () => ({ useMyReportProfile: () => ({ specialtyName: 'Endodoncia' }) }));
vi.mock('../../hooks/usePatients', () => ({
  useAllPatients: () => ({
    patients: [
      {
        id: 'pt1',
        dni: '46831572',
        firstName: 'Sofía',
        lastName: 'Guevara Núñez',
        phone: '951384207',
        email: 'sofia.guevara@gmail.com',
        historyNumber: 245,
        birthDate: '1992-03-01',
        address: 'Jr. Amazonas 412',
      },
      { id: 'pt2', dni: '43906715', firstName: 'Fabián', lastName: 'Olano Ruiz', phone: null, email: null, historyNumber: 12 },
    ],
    isLoading: false,
    error: null,
  }),
}));
vi.mock('../../hooks/useBranches', () => ({
  useBranches: () => ({ branches: [{ id: 'bagua', name: 'Bagua', address: 'Comercio N.° 367' }], isLoading: false, error: null }),
}));
vi.mock('../../services/reportService', () => ({ getPatientHistory: vi.fn() }));

function renderPage(path = '/profesional/reportes/historia') {
  render(
    <MemoryRouter initialEntries={[path]}>
      <PatientHistoryReportPage />
    </MemoryRouter>,
  );
}

describe('PatientHistoryReportPage', () => {
  beforeEach(() => {
    vi.mocked(getPatientHistory).mockResolvedValue([
      entry({ date: '2026-10-16', startTime: '09:30', status: 'confirmed' }),
      entry({ date: '2026-09-18' }),
      entry({ date: '2026-09-04' }),
      entry({ date: '2026-08-21' }),
      entry({
        date: '2025-06-30',
        serviceId: 'blanq',
        serviceName: 'Blanqueamiento dental',
        serviceSessions: 2,
        professionalName: 'Milagros Rojas Díaz',
        reason: 'Mejorar la apariencia',
      }),
    ]);
  });

  it('sin paciente elegido pide buscar uno; la búsqueda acota el selector', async () => {
    renderPage();

    expect(screen.getByText(/Busca por DNI, nombre o N.º de historia/)).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('Buscar paciente'), 'HC-00245');

    const options = within(screen.getByLabelText(/^Paciente/)).getAllByRole('option');
    expect(options.map((option) => option.textContent)).toEqual(['Elige un paciente', 'Guevara Núñez, Sofía · 46831572']);
  });

  it('al elegir el paciente muestra sus datos, tratamientos e historial', async () => {
    renderPage();

    await userEvent.selectOptions(screen.getByLabelText(/^Paciente/), 'pt1');

    expect(await screen.findByRole('heading', { name: 'Historia de paciente' })).toBeInTheDocument();
    expect(getPatientHistory).toHaveBeenCalledWith('pt1');
    expect(screen.getByText('HIS-HC00245-2026-1014')).toBeInTheDocument();
    expect(screen.getByText('HC-00245')).toBeInTheDocument();
    expect(screen.getByText('34 años')).toBeInTheDocument();
    expect(screen.getByText('Jr. Amazonas 412')).toBeInTheDocument();
    expect(screen.getByText('16/10/2026 · 09:30')).toBeInTheDocument();
    expect(screen.getByText('30 jun 2025 – hoy')).toBeInTheDocument();

    const [treatments, history] = screen.getAllByRole('table');
    const treatmentRows = within(treatments).getAllByRole('row').slice(1);
    expect(within(treatmentRows[0]).getByText('3 de 4')).toBeInTheDocument();
    expect(within(treatmentRows[0]).getByText('En tratamiento')).toBeInTheDocument();
    expect(within(treatmentRows[1]).getByText('Blanqueamiento dental')).toBeInTheDocument();
    expect(within(treatmentRows[1]).getByText('Cancelado')).toBeInTheDocument();

    const historyRows = within(history).getAllByRole('row').slice(1);
    expect(historyRows).toHaveLength(5);
    expect(within(historyRows[0]).getByText('16/10/2026')).toBeInTheDocument();
    expect(within(historyRows[4]).getByText('Dra. Milagros Rojas Díaz')).toBeInTheDocument();
  });

  it('la técnica ve el alcance de sus sedes', async () => {
    access.role = 'tecnica';
    renderPage('/profesional/reportes/historia?paciente=pt1');

    expect(await screen.findByText('Citas del paciente en sus sedes')).toBeInTheDocument();
    access.role = 'especialista';
  });
});
