import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import CreateProfessionalModal from './CreateProfessionalModal';
import { createProfessional, getEligibleProfilesForProfessional } from '../../services/professionalService';
import type { Specialty } from '../../types/Specialty';

vi.mock('../../services/professionalService', () => ({
  createProfessional: vi.fn(),
  getEligibleProfilesForProfessional: vi.fn(),
}));

const specialties = [
  { id: 'endo', name: 'Endodoncia', active: true },
  { id: 'orto', name: 'Ortodoncia', active: true },
] as Specialty[];

const onAddExisting = vi.fn();
const onCreated = vi.fn();

function renderModal() {
  render(
    <MemoryRouter>
      <CreateProfessionalModal
        specialties={specialties}
        branches={[{ id: 'jaen', name: 'Jaén' }]}
        onClose={vi.fn()}
        onCreated={onCreated}
        onAddExisting={onAddExisting}
      />
    </MemoryRouter>,
  );
  return userEvent.setup();
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('CreateProfessionalModal', () => {
  it('sin cuentas disponibles no muestra el formulario y ofrece los dos caminos', async () => {
    vi.mocked(getEligibleProfilesForProfessional).mockResolvedValue([]);
    const user = renderModal();

    expect(await screen.findByText('No hay cuentas esperando su ficha')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Crear ficha' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Bio (opcional)')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ir a Equipo' })).toHaveAttribute('href', '/admin/equipo');

    await user.click(screen.getByRole('button', { name: 'Agregar a mi sede' }));
    expect(onAddExisting).toHaveBeenCalledTimes(1);
  });

  it('crea la ficha de una especialista con una sola especialidad', async () => {
    vi.mocked(getEligibleProfilesForProfessional).mockResolvedValue([
      { id: 'ana', fullName: 'Ana Ruiz', email: 'ana@kd.pe', role: 'especialista' },
    ]);
    vi.mocked(createProfessional).mockResolvedValue(undefined as never);
    const user = renderModal();

    await user.selectOptions(await screen.findByLabelText('Cuenta del profesional'), 'ana');
    expect(screen.getByText('ana@kd.pe')).toBeInTheDocument();
    expect(screen.getByText('Una especialista tiene una sola especialidad.')).toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: 'Endodoncia' }));
    await user.click(screen.getByRole('radio', { name: 'Ortodoncia' }));
    await user.type(screen.getByLabelText('Bio (opcional)'), 'Diez años de experiencia');
    await user.click(screen.getByRole('button', { name: 'Crear ficha' }));

    expect(createProfessional).toHaveBeenCalledWith({
      profileId: 'ana',
      bio: 'Diez años de experiencia',
      specialtyIds: ['orto'],
      branchIds: ['jaen'],
    });
    expect(onCreated).toHaveBeenCalled();
  });

  it('pide elegir la cuenta antes de crear', async () => {
    vi.mocked(getEligibleProfilesForProfessional).mockResolvedValue([
      { id: 'ana', fullName: 'Ana Ruiz', email: 'ana@kd.pe', role: 'odontologa_general' },
    ]);
    const user = renderModal();

    await screen.findByLabelText('Cuenta del profesional');
    expect(screen.getByText('Primero elige la cuenta.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Crear ficha' }));

    expect(screen.getByText('Selecciona la cuenta del profesional.')).toBeInTheDocument();
    expect(createProfessional).not.toHaveBeenCalled();
  });
});
