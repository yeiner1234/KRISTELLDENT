import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import BookingSuccessPage from './BookingSuccessPage';

const state = {
  branchName: 'Sede Centro',
  branchRegion: 'Lima',
  professionalName: 'Ana Ríos',
  specialtyName: 'Endodoncia',
  serviceName: 'Endodoncia unirradicular (45 min)',
  date: '2026-11-20',
  time: '09:00',
  appointmentCode: 'KD-ABC234',
  patientName: 'Lucía Paz',
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/reservar/exito', state }]}>
      <BookingSuccessPage />
    </MemoryRouter>,
  );
}

describe('BookingSuccessPage', () => {
  it('muestra el código de la cita con la indicación de guardarlo', () => {
    renderPage();
    expect(screen.getByText('KD-ABC234')).toBeInTheDocument();
    expect(
      screen.getByText('Guárdalo: con tu DNI y este código puedes reprogramar o cancelar tu cita'),
    ).toBeInTheDocument();
    expect(screen.queryByText(/enviamos los detalles a tu correo|enviamos los detalles a/i)).not.toBeInTheDocument();
  });

  it('copia el código al portapapeles', async () => {
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue();
    renderPage();

    await user.click(screen.getByRole('button', { name: /copiar/i }));

    expect(writeText).toHaveBeenCalledWith('KD-ABC234');
    expect(await screen.findByRole('button', { name: /copiado/i })).toBeInTheDocument();
  });

  it('el mensaje de WhatsApp incluye el código', () => {
    renderPage();
    const link = screen.getByRole('link', { name: /whatsapp/i });
    expect(decodeURIComponent(link.getAttribute('href') ?? '')).toContain('KD-ABC234');
  });
});
