import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NewAppointmentModal from './NewAppointmentModal';
import { createPublicAppointment } from '../../services/appointmentService';
import type { Branch } from '../../types/Branch';
import type { Professional } from '../../types/Professional';
import type { Service } from '../../types/Service';

vi.mock('../../services/appointmentService', () => ({ createPublicAppointment: vi.fn() }));
vi.mock('./AdminSlotPicker', () => ({
  default: ({ onSelectDate, onSelectTime }: { onSelectDate: (d: string) => void; onSelectTime: (t: string) => void }) => (
    <button
      type="button"
      onClick={() => {
        onSelectDate('2026-11-20');
        onSelectTime('09:00');
      }}
    >
      Elegir 09:00
    </button>
  ),
}));

const branches = [{ id: 'b1', name: 'Sede Centro', active: true }] as Branch[];
const professionals = [
  { id: 'p1', fullName: 'Ana Ríos', active: true, branchIds: ['b1'], serviceIds: ['s1'], specialtyIds: [] },
] as unknown as Professional[];
const services = [{ id: 's1', name: 'Limpieza', duration: 30, active: true }] as Service[];

function renderModal(onCreated = vi.fn()) {
  render(
    <NewAppointmentModal
      isOpen
      onClose={vi.fn()}
      onCreated={onCreated}
      branches={branches}
      professionals={professionals}
      services={services}
      patients={[]}
    />,
  );
  return { onCreated };
}

async function fillForm(user: ReturnType<typeof userEvent.setup>, overrides: { email?: string; phone?: string } = {}) {
  await user.selectOptions(screen.getByLabelText('Sede'), 'b1');
  await user.selectOptions(screen.getByLabelText('Profesional'), 'p1');
  await user.selectOptions(screen.getByLabelText('Servicio'), 's1');
  await user.type(screen.getByLabelText('DNI'), '12345678');
  await user.type(screen.getByLabelText('Nombre'), 'Lucía');
  await user.type(screen.getByLabelText('Apellidos'), 'Paz');
  await user.type(screen.getByLabelText('Teléfono'), overrides.phone ?? '987654321');
  await user.type(screen.getByLabelText('Correo'), overrides.email ?? 'lucia@correo.pe');
  await user.click(screen.getByRole('button', { name: 'Elegir 09:00' }));
}

describe('NewAppointmentModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('no envía si el correo no es válido', async () => {
    const user = userEvent.setup();
    renderModal();
    await fillForm(user, { email: 'lucia-correo.pe' });

    await user.click(screen.getByRole('button', { name: 'Crear cita' }));

    expect(screen.getByText('Ingresa un correo válido.')).toBeInTheDocument();
    expect(createPublicAppointment).not.toHaveBeenCalled();
  });

  it('no envía si el teléfono no tiene 9 dígitos', async () => {
    const user = userEvent.setup();
    renderModal();
    await fillForm(user, { phone: '98765' });

    await user.click(screen.getByRole('button', { name: 'Crear cita' }));

    expect(screen.getByText('El teléfono debe tener 9 dígitos.')).toBeInTheDocument();
    expect(createPublicAppointment).not.toHaveBeenCalled();
  });

  it('al crear la cita muestra su código', async () => {
    vi.mocked(createPublicAppointment).mockResolvedValue({
      id: 'a1',
      code: 'KD-ABC234',
      patientId: 'pt1',
      date: '2026-11-20',
      startTime: '09:00:00',
      endTime: '09:30:00',
      status: 'pending',
    });
    const user = userEvent.setup();
    const { onCreated } = renderModal();
    await fillForm(user);

    await user.click(screen.getByRole('button', { name: 'Crear cita' }));

    expect(await screen.findByText('KD-ABC234')).toBeInTheDocument();
    expect(vi.mocked(createPublicAppointment).mock.calls[0][0]).not.toHaveProperty('endTime');
    expect(onCreated).toHaveBeenCalled();
  });
});
