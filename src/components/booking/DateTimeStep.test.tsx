import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DateTimeStep from './DateTimeStep';
import { getAvailableSlots } from '../../services/appointmentService';
import { getBranchWeeklyHours } from '../../services/branchScheduleService';
import type { Professional } from '../../types/Professional';

vi.mock('../../services/appointmentService', () => ({ getAvailableSlots: vi.fn() }));
vi.mock('../../services/branchScheduleService', () => ({ getBranchWeeklyHours: vi.fn() }));

const ana: Professional = {
  id: 'ana',
  fullName: 'Ana Ríos',
  role: null,
  bio: null,
  active: true,
  specialtyIds: ['endo'],
  branchIds: ['A'],
  serviceIds: ['s45'],
};
const bety: Professional = { ...ana, id: 'bety', fullName: 'Bety Soto', branchIds: ['B'] };

vi.mock('../../hooks/useProfessionals', () => ({
  useProfessionals: () => ({ professionals: [ana, bety], isLoading: false, error: null }),
}));

function renderStep(date: string | null = '2026-11-16') {
  return render(
    <DateTimeStep
      specialtyId="endo"
      branchId="A"
      professionalId="any"
      serviceId="s45"
      date={date}
      time={null}
      onSelectDate={vi.fn()}
      onSelectTime={vi.fn()}
    />,
  );
}

describe('DateTimeStep', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Domingo 15 de noviembre de 2026, 10:00 en Lima.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-15T15:00:00Z'));
    vi.mocked(getBranchWeeklyHours).mockResolvedValue({
      mon: { open: '09:00', close: '18:00' },
      tue: { open: '09:00', close: '18:00' },
    });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('con cualquier profesional solo consulta a quienes atienden en la sede', async () => {
    vi.mocked(getAvailableSlots).mockResolvedValue([{ time: '09:00', available: true }]);

    renderStep();

    expect(await screen.findByText('09:00')).toBeInTheDocument();
    expect(getAvailableSlots).toHaveBeenCalledTimes(1);
    expect(getAvailableSlots).toHaveBeenCalledWith({ professionalId: 'ana', branchId: 'A', serviceId: 's45', date: '2026-11-16' });
  });

  it('si fallan los horarios muestra el error y Reintentar los vuelve a pedir', async () => {
    vi.mocked(getAvailableSlots)
      .mockRejectedValueOnce(new Error('red caída'))
      .mockResolvedValueOnce([{ time: '09:30', available: true }]);

    renderStep();

    expect(await screen.findByText('No se pudieron cargar los horarios. Intenta de nuevo.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('09:30')).toBeInTheDocument();
  });

  it('sin horarios libres muestra el mensaje de fecha sin horarios', async () => {
    vi.mocked(getAvailableSlots).mockResolvedValue([]);

    renderStep();

    expect(await screen.findByText('No hay horarios disponibles')).toBeInTheDocument();
  });

  it('deshabilita los días pasados y los días en que la sede cierra', async () => {
    vi.mocked(getAvailableSlots).mockResolvedValue([]);

    renderStep(null);

    // Hoy domingo 15 cierra la sede; el 14 ya pasó; el lunes 16 abre.
    expect(await screen.findByRole('button', { name: '15' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '14' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '16' })).toBeEnabled();
  });
});
