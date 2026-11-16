import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ScheduleExceptionsPanel from './ScheduleExceptionsPanel';
import {
  createScheduleException,
  deleteScheduleException,
  getUpcomingBranchClosures,
  getUpcomingProfessionalExceptions,
} from '../../services/scheduleExceptionService';

vi.mock('../../services/scheduleExceptionService', () => ({
  createScheduleException: vi.fn(),
  deleteScheduleException: vi.fn(),
  getUpcomingBranchClosures: vi.fn(),
  getUpcomingProfessionalExceptions: vi.fn(),
}));

const branches = [
  { id: 'A', name: 'Sede Centro' },
  { id: 'B', name: 'Sede Norte' },
];

describe('ScheduleExceptionsPanel (profesional)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getUpcomingProfessionalExceptions).mockResolvedValue([]);
    vi.mocked(createScheduleException).mockResolvedValue();
  });

  it('el turno extra pide sede y se guarda con ella', async () => {
    const user = userEvent.setup();
    render(<ScheduleExceptionsPanel mode="professional" professionalId="p1" branches={branches} />);
    await screen.findByText('No hay ausencias ni turnos extra programados.');

    expect(screen.queryByLabelText('Sede del turno extra')).not.toBeInTheDocument();
    await user.click(screen.getByLabelText('Turno extra'));
    await user.selectOptions(screen.getByLabelText('Sede del turno extra'), 'B');
    await user.type(screen.getByLabelText('Fecha'), '2099-01-05');
    await user.click(screen.getByRole('button', { name: 'Agregar' }));

    expect(createScheduleException).toHaveBeenCalledWith(
      expect.objectContaining({ professionalId: 'p1', branchId: 'B', isAvailable: true }),
    );
  });

  it('la ausencia se guarda sin sede (vale en todas)', async () => {
    const user = userEvent.setup();
    render(<ScheduleExceptionsPanel mode="professional" professionalId="p1" branches={branches} />);
    await screen.findByText('No hay ausencias ni turnos extra programados.');

    await user.type(screen.getByLabelText('Fecha'), '2099-01-05');
    await user.click(screen.getByRole('button', { name: 'Agregar' }));

    expect(createScheduleException).toHaveBeenCalledWith(
      expect.objectContaining({ professionalId: 'p1', branchId: null, isAvailable: false }),
    );
  });
});

describe('ScheduleExceptionsPanel — borrar', () => {
  const closure = {
    id: 'c1',
    professionalId: null,
    branchId: 'A',
    date: '2099-01-05',
    isAvailable: false,
    startTime: null,
    endTime: null,
    reason: 'Feriado',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getUpcomingBranchClosures).mockResolvedValue([closure]);
    vi.mocked(deleteScheduleException).mockResolvedValue();
  });

  it('pide confirmación y no borra si se responde No', async () => {
    const user = userEvent.setup();
    render(<ScheduleExceptionsPanel mode="branch" branchId="A" />);

    await user.click(await screen.findByRole('button', { name: 'Borrar' }));
    expect(screen.getByText('¿Borrar?')).toBeInTheDocument();
    expect(deleteScheduleException).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'No' }));
    expect(screen.queryByText('¿Borrar?')).not.toBeInTheDocument();
    expect(deleteScheduleException).not.toHaveBeenCalled();
  });

  it('borra al confirmar', async () => {
    const user = userEvent.setup();
    render(<ScheduleExceptionsPanel mode="branch" branchId="A" />);

    await user.click(await screen.findByRole('button', { name: 'Borrar' }));
    await user.click(screen.getByRole('button', { name: 'Sí, borrar' }));

    expect(deleteScheduleException).toHaveBeenCalledWith('c1');
    expect(await screen.findByText('No hay feriados ni cierres programados.')).toBeInTheDocument();
  });
});
