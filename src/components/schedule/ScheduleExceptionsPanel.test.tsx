import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ScheduleExceptionsPanel from './ScheduleExceptionsPanel';
import {
  createScheduleException,
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
