import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import ConfirmBookingPage from './ConfirmBookingPage';
import { createPublicAppointment } from '../../services/appointmentService';
import { useServices } from '../../hooks/useServices';

vi.mock('../../services/appointmentService', () => ({ createPublicAppointment: vi.fn() }));
vi.mock('../../hooks/useServices', () => ({ useServices: vi.fn() }));
vi.mock('../../hooks/useBranches', () => ({
  useBranches: () => ({ branches: [{ id: 'b1', name: 'Sede Centro', region: 'Lima' }], isLoading: false, error: null }),
}));
vi.mock('../../hooks/useProfessionals', () => ({
  useProfessionals: () => ({ professionals: [{ id: 'p1', fullName: 'Ana Ríos' }], isLoading: false, error: null }),
  useSpecialties: () => ({ specialties: [{ id: 'sp1', name: 'Endodoncia' }], isLoading: false, error: null }),
}));

const service = { id: 's1', name: 'Endodoncia unirradicular', duration: 45, specialtyId: 'sp1', active: true };

const state = {
  specialtyId: 'sp1',
  branchId: 'b1',
  professionalId: 'p1',
  serviceId: 's1',
  date: '2026-11-20',
  time: '09:00',
  firstName: 'Lucía',
  lastName: 'Paz',
  dni: '12345678',
  phone: '987654321',
  email: 'lucia@correo.pe',
};

function SuccessProbe() {
  const location = useLocation();
  return <p>Código: {(location.state as { appointmentCode: string }).appointmentCode}</p>;
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/reservar/confirmar', state }]}>
      <Routes>
        <Route path="/reservar/confirmar" element={<ConfirmBookingPage />} />
        <Route path="/reservar/exito" element={<SuccessProbe />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ConfirmBookingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useServices).mockReturnValue({ services: [service] as never, isLoading: false, error: null });
  });

  it('deshabilita Confirmar mientras cargan los servicios', () => {
    vi.mocked(useServices).mockReturnValue({ services: [], isLoading: true, error: null });
    renderPage();
    expect(screen.getByRole('button', { name: /confirmar/i })).toBeDisabled();
  });

  it('envía una sola vez, sin endTime, y muestra el código devuelto por el servidor', async () => {
    let resolve!: (value: Awaited<ReturnType<typeof createPublicAppointment>>) => void;
    vi.mocked(createPublicAppointment).mockReturnValue(new Promise((r) => (resolve = r)));
    const user = userEvent.setup();
    renderPage();

    const button = screen.getByRole('button', { name: /confirmar cita/i });
    await user.click(button);
    expect(screen.getByRole('button', { name: /confirmando/i })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: /confirmando/i }));

    expect(createPublicAppointment).toHaveBeenCalledTimes(1);
    expect(vi.mocked(createPublicAppointment).mock.calls[0][0]).not.toHaveProperty('endTime');

    resolve({
      id: 'a1',
      code: 'KD-ABC234',
      patientId: 'pt1',
      date: '2026-11-20',
      startTime: '09:00:00',
      endTime: '09:45:00',
      status: 'pending',
    });

    expect(await screen.findByText('Código: KD-ABC234')).toBeInTheDocument();
  });

  it('muestra el mensaje del servidor tal cual', async () => {
    vi.mocked(createPublicAppointment).mockRejectedValue(new Error('Ya tienes una cita que se cruza con ese horario.'));
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: /confirmar cita/i }));

    expect(await screen.findByText('Ya tienes una cita que se cruza con ese horario.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /confirmar cita/i })).toBeEnabled();
  });
});
