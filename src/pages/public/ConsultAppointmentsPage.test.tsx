import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import ConsultAppointmentsPage from './ConsultAppointmentsPage';
import { getPatientAppointments, requestAppointmentCodes } from '../../services/appointmentService';

vi.mock('../../services/appointmentService', () => ({
  getPatientAppointments: vi.fn(),
  requestAppointmentCodes: vi.fn(),
}));

function MyAppointmentsProbe() {
  const location = useLocation();
  const state = location.state as { dni: string; code: string };
  return (
    <p>
      Mis citas {state.dni} {state.code} {location.search || 'sin-query'}
    </p>
  );
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/consultar-citas']}>
      <Routes>
        <Route path="/consultar-citas" element={<ConsultAppointmentsPage />} />
        <Route path="/mis-citas" element={<MyAppointmentsProbe />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ConsultAppointmentsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('con DNI y código válidos navega a /mis-citas con ambos en el state, no en la URL', async () => {
    vi.mocked(getPatientAppointments).mockResolvedValue({ patientName: 'Lucía Paz', appointments: [] });
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText('DNI'), '12345678');
    await user.type(screen.getByLabelText('Código de la cita'), 'kd-abc234');
    await user.click(screen.getByRole('button', { name: /ver mis citas/i }));

    expect(getPatientAppointments).toHaveBeenCalledWith('12345678', 'kd-abc234');
    expect(await screen.findByText('Mis citas 12345678 kd-abc234 sin-query')).toBeInTheDocument();
  });

  it('muestra "El DNI y el código no coinciden." y no navega', async () => {
    vi.mocked(getPatientAppointments).mockRejectedValue(new Error('El DNI y el código no coinciden.'));
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText('DNI'), '12345678');
    await user.type(screen.getByLabelText('Código de la cita'), 'KD-ZZZ999');
    await user.click(screen.getByRole('button', { name: /ver mis citas/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('El DNI y el código no coinciden.');
    expect(screen.getByRole('button', { name: /ver mis citas/i })).toBeEnabled();
  });

  it('valida el DNI y exige el código antes de consultar', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText('DNI'), '1234');
    await user.click(screen.getByRole('button', { name: /ver mis citas/i }));

    expect(screen.getByText('Ingresa un DNI válido de 8 dígitos.')).toBeInTheDocument();
    expect(screen.getByText(/ingresa el código de tu cita/i)).toBeInTheDocument();
    expect(getPatientAppointments).not.toHaveBeenCalled();
  });

  it('¿No tienes tu código? pide el DNI y muestra el mensaje del servidor', async () => {
    vi.mocked(requestAppointmentCodes).mockResolvedValue(
      'Si el DNI tiene citas registradas, te enviamos los códigos a tu correo.',
    );
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: /no tienes tu código/i }));
    await user.type(screen.getAllByLabelText('DNI')[1], '87654321');
    await user.click(screen.getByRole('button', { name: /enviarme mis códigos/i }));

    expect(requestAppointmentCodes).toHaveBeenCalledWith('87654321');
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Si el DNI tiene citas registradas, te enviamos los códigos a tu correo.',
    );
  });
});
