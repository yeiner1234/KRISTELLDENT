import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import IndicatorsPage from './IndicatorsPage';
import { getAppointmentIndicators } from '../../services/indicatorService';

const access = vi.hoisted(() => ({ role: 'admin_sede' }));

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'yo', name: 'Ana', role: access.role } }),
}));
vi.mock('../../hooks/useAdminProfessionals', () => ({
  useAdminProfessionals: () => ({
    professionals: [
      { id: 'p1', fullName: 'Ana Ríos', active: true },
      { id: 'p2', fullName: 'Eva Soto', active: true },
    ],
  }),
}));
vi.mock('../../hooks/useAdminBranches', () => ({
  useAdminBranches: () => ({ branches: [{ id: 'b1', name: 'Sede Centro' }, { id: 'b2', name: 'Sede Norte' }] }),
}));
vi.mock('../../services/indicatorService', () => ({ getAppointmentIndicators: vi.fn() }));
// Hoy en Lima: 25 de noviembre de 2026.
vi.mock('../../utils/date', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../utils/date')>()),
  getTodayIsoDate: () => '2026-11-25',
}));

const card = (label: string) => screen.getByText(label, { selector: 'span' }).closest('div')!.parentElement!;

describe('IndicatorsPage (HU16)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    access.role = 'admin_sede';
    vi.mocked(getAppointmentIndicators).mockResolvedValue([
      { branchId: 'b1', professionalId: 'p1', status: 'completed', isPast: true, total: 6 },
      { branchId: 'b1', professionalId: 'p1', status: 'confirmed', isPast: true, total: 2 },
      { branchId: 'b1', professionalId: 'p2', status: 'cancelled', isPast: false, total: 1 },
      { branchId: 'b1', professionalId: 'p2', status: 'pending', isPast: false, total: 1 },
    ]);
  });

  it('muestra las citas del mes actual reservadas, atendidas, no asistidas y canceladas', async () => {
    render(<IndicatorsPage />);

    await waitFor(() => expect(screen.getByRole('region', { name: 'Resumen del periodo' })).toBeInTheDocument());
    expect(getAppointmentIndicators).toHaveBeenCalledWith({ from: '2026-11-01', to: '2026-11-30', professionalId: '', branchId: '' });

    expect(within(card('Reservadas')).getByText('10')).toBeInTheDocument();
    expect(within(card('Atendidas')).getByText('6')).toBeInTheDocument();
    expect(within(card('No asistidas')).getByText('2')).toBeInTheDocument();
    expect(within(card('Canceladas')).getByText('1')).toBeInTheDocument();
    expect(within(card('Atendidas')).getByText('60 % del total')).toBeInTheDocument();

    const byProfessional = screen.getByRole('region', { name: 'Por profesional' });
    expect(within(byProfessional).getAllByText('Ana Ríos').length).toBeGreaterThan(0);
  });

  it('filtra por profesional y por fecha (criterio 2)', async () => {
    const user = userEvent.setup();
    render(<IndicatorsPage />);
    await waitFor(() => expect(getAppointmentIndicators).toHaveBeenCalled());

    await user.selectOptions(screen.getByLabelText('Profesional'), 'p2');
    await waitFor(() => expect(getAppointmentIndicators).toHaveBeenLastCalledWith(expect.objectContaining({ professionalId: 'p2' })));

    const from = screen.getByLabelText('Desde');
    await user.clear(from);
    await user.type(from, '2026-11-10');
    await waitFor(() => expect(getAppointmentIndicators).toHaveBeenLastCalledWith(expect.objectContaining({ from: '2026-11-10' })));
  });

  it('el admin_sede no puede elegir otra sede (caso límite 1)', async () => {
    render(<IndicatorsPage />);
    await waitFor(() => expect(getAppointmentIndicators).toHaveBeenCalled());

    expect(screen.queryByLabelText('Sede')).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Por sede' })).not.toBeInTheDocument();
  });

  it('el admin_global ve todas las sedes y puede elegir una (criterio 3)', async () => {
    access.role = 'admin_global';
    const user = userEvent.setup();
    render(<IndicatorsPage />);

    await waitFor(() => expect(screen.getByRole('region', { name: 'Por sede' })).toBeInTheDocument());
    await user.selectOptions(screen.getByLabelText('Sede'), 'b2');

    await waitFor(() => expect(getAppointmentIndicators).toHaveBeenLastCalledWith(expect.objectContaining({ branchId: 'b2' })));
  });

  it('si la consulta falla muestra el mensaje, sin quedarse cargando', async () => {
    vi.mocked(getAppointmentIndicators).mockRejectedValue(new Error('No se pudieron cargar los indicadores.'));
    render(<IndicatorsPage />);

    expect(await screen.findByText('No se pudieron cargar los indicadores')).toBeInTheDocument();
  });
});
