import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import MyAppointmentsPage from './MyAppointmentsPage';
import {
  cancelPatientAppointment,
  getAvailableSlots,
  getPatientAppointments,
  reschedulePatientAppointment,
} from '../../services/appointmentService';
import type { PatientAppointment } from '../../types/Appointment';

vi.mock('../../services/appointmentService', () => ({
  getPatientAppointments: vi.fn(),
  cancelPatientAppointment: vi.fn(),
  reschedulePatientAppointment: vi.fn(),
  getAvailableSlots: vi.fn().mockResolvedValue([]),
}));
vi.mock('../../utils/date', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../utils/date')>()),
  getTodayIsoDate: () => '2026-11-15',
  getLimaNowTime: () => '08:00',
}));

function appointment(overrides: Partial<PatientAppointment>): PatientAppointment {
  return {
    id: 'a1',
    code: 'KD-AAA222',
    date: '2026-11-20',
    startTime: '10:00',
    endTime: '10:45',
    status: 'pending',
    branchId: 'b1',
    branchName: 'Sede Centro',
    professionalId: 'p1',
    professionalName: 'Ana Ríos',
    serviceId: 's1',
    serviceName: 'Endodoncia',
    serviceDuration: 45,
    ...overrides,
  };
}

const pending = appointment({});
const completed = appointment({ id: 'a2', code: 'KD-BBB333', date: '2026-11-10', status: 'completed' });

function renderPage(state: unknown = { dni: '12345678', code: 'KD-AAA222' }) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/mis-citas', state }]}>
      <Routes>
        <Route path="/mis-citas" element={<MyAppointmentsPage />} />
        <Route path="/consultar-citas" element={<p>Pantalla consultar</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('MyAppointmentsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getPatientAppointments).mockResolvedValue({ patientName: 'Lucía Paz', appointments: [completed, pending] });
  });

  it('sin DNI y código en el state vuelve a /consultar-citas', () => {
    renderPage(null);
    expect(screen.getByText('Pantalla consultar')).toBeInTheDocument();
    expect(getPatientAppointments).not.toHaveBeenCalled();
  });

  it('muestra las citas con código, sede, profesional y servicio; botones solo en la pendiente futura', async () => {
    renderPage();

    const pendingCard = await screen.findByRole('article', { name: 'Cita KD-AAA222' });
    expect(within(pendingCard).getByText('Sede Centro')).toBeInTheDocument();
    expect(within(pendingCard).getByText('Ana Ríos')).toBeInTheDocument();
    expect(within(pendingCard).getByText(/Endodoncia/)).toBeInTheDocument();
    expect(within(pendingCard).getByRole('button', { name: 'Reprogramar' })).toBeInTheDocument();
    expect(within(pendingCard).getByRole('button', { name: 'Cancelar cita' })).toBeInTheDocument();

    const completedCard = screen.getByRole('article', { name: 'Cita KD-BBB333' });
    expect(within(completedCard).queryByRole('button')).not.toBeInTheDocument();
    expect(getPatientAppointments).toHaveBeenCalledWith('12345678', 'KD-AAA222');
  });

  it('cancelar pide confirmación, llama al servidor y recarga la lista', async () => {
    vi.mocked(cancelPatientAppointment).mockResolvedValue();
    const user = userEvent.setup();
    renderPage();

    const card = await screen.findByRole('article', { name: 'Cita KD-AAA222' });
    await user.click(within(card).getByRole('button', { name: 'Cancelar cita' }));
    expect(cancelPatientAppointment).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: /sí, cancelar cita/i }));

    expect(cancelPatientAppointment).toHaveBeenCalledWith('12345678', 'KD-AAA222', 'a1');
    expect(await screen.findByText('La cita KD-AAA222 fue cancelada.')).toBeInTheDocument();
    expect(getPatientAppointments).toHaveBeenCalledTimes(2);
  });

  it('si cancelar falla, el error se ve en el diálogo', async () => {
    vi.mocked(cancelPatientAppointment).mockRejectedValue(new Error('La cita ya fue atendida: no se puede modificar.'));
    const user = userEvent.setup();
    renderPage();

    const card = await screen.findByRole('article', { name: 'Cita KD-AAA222' });
    await user.click(within(card).getByRole('button', { name: 'Cancelar cita' }));
    await user.click(screen.getByRole('button', { name: /sí, cancelar cita/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('La cita ya fue atendida: no se puede modificar.');
  });

  it('si la consulta falla muestra el error y permite reintentar', async () => {
    vi.mocked(getPatientAppointments).mockRejectedValue(new Error('No se pudieron consultar tus citas.'));
    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudieron consultar tus citas.');
    expect(screen.getByRole('button', { name: /reintentar/i })).toBeInTheDocument();
  });
  it('reprogramar muestra solo los horarios libres (excluyendo la propia cita) y mueve la cita', async () => {
    vi.mocked(getAvailableSlots).mockResolvedValue([{ time: '11:00', available: true }]);
    vi.mocked(reschedulePatientAppointment).mockResolvedValue();
    const user = userEvent.setup();
    renderPage();

    const card = await screen.findByRole('article', { name: 'Cita KD-AAA222' });
    await user.click(within(card).getByRole('button', { name: 'Reprogramar' }));
    const dialog = screen.getByRole('dialog', { name: 'Reprogramar cita' });
    await user.click(within(dialog).getByRole('button', { name: '21' }));

    await user.click(await within(dialog).findByRole('button', { name: '11:00' }));
    expect(getAvailableSlots).toHaveBeenCalledWith({
      professionalId: 'p1',
      branchId: 'b1',
      serviceId: 's1',
      date: '2026-11-21',
      excludeAppointmentId: 'a1',
    });

    await user.click(screen.getByRole('button', { name: /confirmar nuevo horario/i }));

    expect(reschedulePatientAppointment).toHaveBeenCalledWith('12345678', 'KD-AAA222', 'a1', {
      date: '2026-11-21',
      startTime: '11:00',
    });
    expect(await screen.findByText('La cita KD-AAA222 fue reprogramada.')).toBeInTheDocument();
    expect(getPatientAppointments).toHaveBeenCalledTimes(2);
  });
});
