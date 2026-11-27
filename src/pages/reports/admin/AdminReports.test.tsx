import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import AppointmentsReportPage from './AppointmentsReportPage';
import PatientsReportPage from './PatientsReportPage';
import PerformanceReportPage from './PerformanceReportPage';
import RevenueReportPage from './RevenueReportPage';
import type { ReportAppointment } from '../../../utils/reports/adminData';
import type { AdminReportData } from '../../../hooks/useAdminReportData';
import { exportSheetToPdf } from '../../../lib/pdfExport';

const access = vi.hoisted(() => ({ role: 'admin_global' as 'admin_global' | 'admin_sede' }));

function row(overrides: Partial<ReportAppointment>): ReportAppointment {
  return {
    id: Math.random().toString(36).slice(2),
    code: 'KD-1',
    patientId: 'p1',
    professionalId: 'd1',
    branchId: 'bagua',
    serviceId: 'endo',
    date: '2026-08-10',
    startTime: '09:00',
    endTime: '10:30',
    status: 'completed',
    reason: '',
    specialtyId: 'endo',
    specialtyName: 'Endodoncia',
    serviceLabel: 'Endodoncia',
    durationMinutes: 90,
    price: 350,
    listPrice: 380,
    doctorName: 'Lucía Mendoza Paz',
    branchName: 'Bagua',
    ...overrides,
  };
}

const branches = [
  { id: 'bagua', name: 'Bagua', address: 'Comercio N.° 367', region: null, googleMapsAddress: null, phone: null, lat: null, lng: null, active: true },
  { id: 'jaen', name: 'Jaén', address: 'Mesones Muro 120', region: null, googleMapsAddress: null, phone: null, lat: null, lng: null, active: true },
];

const rows = [
  row({ patientId: 'p1', date: '2026-08-10' }),
  row({ patientId: 'p1', date: '2026-09-02' }),
  row({ patientId: 'p2', status: 'cancelled', date: '2026-09-03' }),
  row({ patientId: 'p2', status: 'confirmed', date: '2026-09-05' }),
  row({
    patientId: 'p3',
    branchId: 'jaen',
    branchName: 'Jaén',
    professionalId: 'd2',
    doctorName: 'Ana Torres Ríos',
    serviceId: 'limp',
    serviceLabel: 'Limpieza dental',
    specialtyId: 'gen',
    specialtyName: 'Odontología general',
    durationMinutes: 30,
    price: 80,
    listPrice: 80,
    date: '2026-09-10',
  }),
];

function reportData(): AdminReportData {
  const isGlobal = access.role === 'admin_global';
  const visible = isGlobal ? rows : rows.filter((item) => item.branchId === 'bagua');
  return {
    isGlobal,
    allowedBranches: isGlobal ? branches : [branches[0]],
    rows: visible,
    patients: [
      { id: 'p1', dni: '46831572', firstName: 'Sofía', lastName: 'Guevara Núñez', phone: null, email: null },
      { id: 'p2', dni: '43906715', firstName: 'Fabián', lastName: 'Olano Ruiz', phone: null, email: null },
      { id: 'p3', dni: '44409000', firstName: 'Luis', lastName: 'Fernández Tapia', phone: null, email: null },
    ],
    professionals: [
      { id: 'd1', fullName: 'Lucía Mendoza Paz', role: 'especialista', specialtyIds: ['endo'], branchIds: ['bagua'] },
      { id: 'd2', fullName: 'Ana Torres Ríos', role: 'odontologa_general', specialtyIds: [], branchIds: ['jaen'] },
    ] as AdminReportData['professionals'],
    specialties: [
      { id: 'endo', name: 'Endodoncia', description: null, active: true },
      { id: 'gen', name: 'Odontología general', description: null, active: true },
    ],
    isLoading: false,
    error: null,
  };
}

vi.mock('../../../utils/date', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../utils/date')>()),
  getTodayIsoDate: () => '2026-10-14',
  getLimaNowTime: () => '07:00',
}));
vi.mock('../../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: {
      id: 'u1',
      name: access.role === 'admin_global' ? 'Jorge Salinas Vera' : 'Mónica Herrera Paz',
      email: 'a@kd.pe',
      role: access.role,
    },
  }),
}));
vi.mock('../../../hooks/useAdminReportData', () => ({ useAdminReportData: () => reportData() }));
vi.mock('../../../lib/pdfExport', () => ({ exportSheetToPdf: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../../../services/reportService', () => ({
  getClinicBenchmarks: vi.fn().mockResolvedValue({
    completed: 9,
    cancelled: 1,
    unclosed: 4,
    completedMinutes: 540,
    doctors: 3,
    patientsAttended: 6,
    patientsRecurrent: 3,
  }),
  getPatientsFirstVisit: vi.fn().mockResolvedValue(new Map([['p1', '2024-03-12']])),
}));

function renderPage(page: React.ReactElement) {
  render(<MemoryRouter>{page}</MemoryRouter>);
}

describe('Reportes de administración', () => {
  beforeEach(() => {
    access.role = 'admin_global';
  });

  it('Reporte de citas, nivel global: compara las sedes y filtra por sede', async () => {
    renderPage(<AppointmentsReportPage />);

    expect(screen.getByRole('heading', { name: 'Reporte de citas' })).toBeInTheDocument();
    expect(screen.getByText('REP-CIT-GLO-2026-1014')).toBeInTheDocument();
    expect(screen.getByText('Todas las sedes (2)')).toBeInTheDocument();
    expect(screen.getByText('Comparativo por sede')).toBeInTheDocument();
    expect(screen.getByText('Por especialidad')).toBeInTheDocument();
    // 3 atendidas y 1 cancelada.
    expect(screen.getAllByText('75.0 %').length).toBeGreaterThan(0);

    await userEvent.selectOptions(screen.getByLabelText('Sede'), 'jaen');

    expect(screen.getByText('REP-CIT-JAE-2026-1014')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Por doctora/ })).toBeInTheDocument();
  });

  it('Reporte de citas, nivel sede: su sede, sin selector, con el promedio de la clínica', async () => {
    access.role = 'admin_sede';
    renderPage(<AppointmentsReportPage />);

    expect(screen.getByText('Solo sede Bagua')).toBeInTheDocument();
    expect(screen.getByText('Bagua (asignada)')).toBeInTheDocument();
    expect(screen.queryByLabelText('Sede')).not.toBeInTheDocument();
    expect(await screen.findByText('promedio clínica: 90.0 %')).toBeInTheDocument();
    // La cita confirmada del 05/09 quedó sin cerrar.
    expect(within(screen.getAllByRole('table')[1]).getByText('Olano Ruiz, Fabián')).toBeInTheDocument();
  });

  it('Reporte de pacientes: frecuentes con DNI enmascarado y sin inactivos', async () => {
    renderPage(<PatientsReportPage />);

    expect(await screen.findByRole('heading', { name: 'Reporte de pacientes' })).toBeInTheDocument();
    expect(screen.getByText('Comparativo por sede')).toBeInTheDocument();
    expect(screen.queryByText(/inactivo/i)).not.toBeInTheDocument();
    expect(screen.queryByText('46831572')).not.toBeInTheDocument();
  });

  it('Reporte de desempeño: horas clínicas y ranking de servicios', () => {
    renderPage(<PerformanceReportPage />);

    expect(screen.getByRole('heading', { name: 'Reporte de desempeño' })).toBeInTheDocument();
    // 2 endodoncias de 90 min + 1 limpieza de 30 min = 3.5 h → "4 h" redondeado.
    expect(screen.getByText('4 h')).toBeInTheDocument();
    expect(screen.getByText('Ranking de servicios')).toBeInTheDocument();
  });

  it('Reporte de ingresos: ingreso con el precio de la cita y precio vigente por servicio', () => {
    renderPage(<RevenueReportPage />);

    expect(screen.getByRole('heading', { name: 'Reporte de ingresos' })).toBeInTheDocument();
    // 350 + 350 + 80.
    expect(screen.getAllByText('S/ 780').length).toBeGreaterThan(0);
    expect(screen.getByText('S/ 380')).toBeInTheDocument();
    expect(screen.getByText(/Cifras estimadas/)).toBeInTheDocument();
  });

  it('«Descargar PDF» genera el archivo de la hoja con el código del documento', async () => {
    renderPage(<RevenueReportPage />);

    await userEvent.click(screen.getByRole('button', { name: 'Descargar PDF' }));

    expect(exportSheetToPdf).toHaveBeenCalledWith(document.querySelector('[data-pdf-sheet]'), 'REP-ING-GLO-2026-1014.pdf');
    expect(screen.getByRole('button', { name: 'Imprimir' })).toBeInTheDocument();
  });

  it('si el PDF falla, lo dice y sugiere imprimir', async () => {
    vi.mocked(exportSheetToPdf).mockRejectedValueOnce(new Error('canvas'));
    renderPage(<PerformanceReportPage />);

    await userEvent.click(screen.getByRole('button', { name: 'Descargar PDF' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo generar el PDF');
    expect(screen.getByRole('button', { name: 'Descargar PDF' })).toBeEnabled();
  });
});
