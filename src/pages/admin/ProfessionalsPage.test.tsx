import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import ProfessionalsPage from './ProfessionalsPage';
import { getProfessionalScheduleForAdmin, setProfessionalSchedule } from '../../services/professionalScheduleService';
import { getBranchScheduleForAdmin } from '../../services/branchScheduleService';
import { updateProfessional } from '../../services/professionalService';
import type { Professional } from '../../types/Professional';

const anali: Professional = {
  id: 'anali',
  fullName: 'ANali',
  role: 'especialista',
  bio: null,
  active: true,
  specialtyIds: ['endo'],
  branchIds: ['bagua', 'chacha'],
  serviceIds: [],
};

const branch = (id: string, name: string, active: boolean) => ({
  id,
  name,
  address: '',
  region: null,
  googleMapsAddress: null,
  phone: null,
  lat: null,
  lng: null,
  active,
  createdAt: '',
  updatedAt: '',
});

vi.mock('../../hooks/useAdminProfessionals', () => ({
  useAdminProfessionals: () => ({ professionals: [anali], isLoading: false, error: null, refetch: vi.fn() }),
}));
vi.mock('../../hooks/useAdminSpecialties', () => ({
  useAdminSpecialties: () => ({
    specialties: [{ id: 'endo', name: 'Endodoncia', description: null, active: true }],
    isLoading: false, error: null, refetch: vi.fn() }),
}));
vi.mock('../../hooks/useAdminServices', () => ({
  useAdminServices: () => ({ services: [], isLoading: false, error: null, refetch: vi.fn() }),
}));
vi.mock('../../hooks/useAdminBranches', () => ({
  useAdminBranches: () => ({
    branches: [branch('bagua', 'Bagua', false), branch('chacha', 'Chachapoyas', true)],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));
vi.mock('../../services/professionalScheduleService', () => ({
  getProfessionalScheduleForAdmin: vi.fn(),
  setProfessionalSchedule: vi.fn(),
}));
vi.mock('../../services/branchScheduleService', () => ({ getBranchScheduleForAdmin: vi.fn() }));
vi.mock('../../services/professionalService', () => ({
  createProfessional: vi.fn(),
  getEligibleProfilesForProfessional: vi.fn(),
  setProfessionalActive: vi.fn(),
  updateProfessional: vi.fn(),
}));

async function openSchedule() {
  const user = userEvent.setup();
  render(
    <MemoryRouter>
      <ProfessionalsPage />
    </MemoryRouter>,
  );
  await user.click(screen.getByRole('button', { name: 'Horario' }));
  const dialog = await screen.findByRole('dialog');
  await within(dialog).findByLabelText('Lunes, inicio del bloque 1');
  return { user, dialog };
}

describe('ProfessionalsPage — modal Horario', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Element.prototype.scrollIntoView = vi.fn();
    vi.mocked(getProfessionalScheduleForAdmin).mockResolvedValue([
      { dayOfWeek: 1, startTime: '09:00', endTime: '13:00' },
      { dayOfWeek: 1, startTime: '12:00', endTime: '14:00' },
    ]);
    vi.mocked(getBranchScheduleForAdmin).mockResolvedValue([]);
  });

  it('solo ofrece las sedes activas y abre en la primera activa', async () => {
    const { dialog } = await openSchedule();

    const select = within(dialog).getByLabelText('Sede');
    expect(within(select).getAllByRole('option').map((option) => option.textContent)).toEqual(['Chachapoyas']);
    expect(getProfessionalScheduleForAdmin).toHaveBeenCalledWith('anali', 'chacha');
  });

  it('muestra el error del horario y lo quita al corregir un bloque', async () => {
    const { user, dialog } = await openSchedule();

    await user.click(screen.getByRole('button', { name: 'Guardar horario' }));
    expect(within(dialog).getByRole('alert')).toHaveTextContent('Lunes: Los rangos se cruzan.');
    expect(setProfessionalSchedule).not.toHaveBeenCalled();

    await user.click(within(dialog).getAllByRole('button', { name: 'Quitar bloque' })[1]);
    expect(within(dialog).queryByRole('alert')).not.toBeInTheDocument();
  });
});

describe('ProfessionalsPage — formulario', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Element.prototype.scrollIntoView = vi.fn();
  });

  async function openEdit() {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ProfessionalsPage />
      </MemoryRouter>,
    );
    await user.click(screen.getByRole('button', { name: 'Editar' }));
    const dialog = await screen.findByRole('dialog');
    return { user, dialog };
  }

  it('no guarda un especialista sin sede activa', async () => {
    const { user, dialog } = await openEdit();

    // Bagua está inactiva: quitar Chachapoyas deja al especialista sin sede activa.
    await user.click(within(dialog).getByLabelText('Chachapoyas'));
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(within(dialog).getByText('Elige al menos una sede activa.')).toBeInTheDocument();
    expect(updateProfessional).not.toHaveBeenCalled();
  });
});
