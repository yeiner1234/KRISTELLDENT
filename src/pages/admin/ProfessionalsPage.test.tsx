import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
  branchIds: ['bagua', 'chacha', 'jaen'],
  serviceIds: [],
};

// null = admin_global (todas las sedes); una lista = admin_sede.
const access = vi.hoisted(() => ({ branchIds: null as string[] | null }));

// Solo en Bagua (inactiva): no tiene botón Horario.
const bea: Professional = { ...anali, id: 'bea', fullName: 'Bea', branchIds: ['bagua'] };

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
  useAdminProfessionals: () => ({ professionals: [anali, bea], isLoading: false, error: null, refetch: vi.fn() }),
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
    branches: [branch('bagua', 'Bagua', false), branch('chacha', 'Chachapoyas', true), branch('jaen', 'Jaén', true)],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));
vi.mock('../../hooks/useManageableBranchIds', () => ({
  useManageableBranchIds: () => ({ branchIds: access.branchIds, isLoading: false, error: null }),
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
    expect(within(select).getAllByRole('option').map((option) => option.textContent)).toEqual(['Chachapoyas', 'Jaén']);
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

describe('ProfessionalsPage — horario dentro del de la sede', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('no guarda un bloque que empieza antes de que abra la sede', async () => {
    vi.mocked(getBranchScheduleForAdmin).mockResolvedValue([{ dayOfWeek: 1, openTime: '08:00', closeTime: '14:00' }]);
    vi.mocked(getProfessionalScheduleForAdmin).mockResolvedValue([{ dayOfWeek: 1, startTime: '07:00', endTime: '12:00' }]);
    const { user, dialog } = await openSchedule();

    await user.click(screen.getByRole('button', { name: 'Guardar horario' }));

    expect(within(dialog).getByRole('alert')).toHaveTextContent(
      'Lunes: El horario del profesional debe estar dentro del horario de la sede.',
    );
    expect(setProfessionalSchedule).not.toHaveBeenCalled();
  });

  it('no deja guardar si no se pudo cargar el horario de la sede', async () => {
    vi.mocked(getBranchScheduleForAdmin).mockRejectedValue(new Error('sin red'));
    vi.mocked(getProfessionalScheduleForAdmin).mockResolvedValue([]);
    render(
      <MemoryRouter>
        <ProfessionalsPage />
      </MemoryRouter>,
    );
    await userEvent.setup().click(screen.getByRole('button', { name: 'Horario' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('sin red');
    expect(screen.getByRole('button', { name: 'Guardar horario' })).toBeDisabled();
  });
});

describe('ProfessionalsPage — horario para admin_sede', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Element.prototype.scrollIntoView = vi.fn();
    vi.mocked(getProfessionalScheduleForAdmin).mockResolvedValue([{ dayOfWeek: 1, startTime: '09:00', endTime: '13:00' }]);
    vi.mocked(getBranchScheduleForAdmin).mockResolvedValue([]);
    access.branchIds = ['jaen'];
  });

  afterEach(() => {
    access.branchIds = null;
  });

  it('abre en su sede y muestra las demás en solo lectura', async () => {
    const { user, dialog } = await openSchedule();

    expect(getProfessionalScheduleForAdmin).toHaveBeenCalledWith('anali', 'jaen');
    const select = within(dialog).getByLabelText('Sede');
    expect(within(select).getAllByRole('option').map((option) => option.textContent)).toEqual([
      'Chachapoyas (solo lectura)',
      'Jaén',
    ]);
    expect(screen.getByRole('button', { name: 'Guardar horario' })).toBeEnabled();

    await user.selectOptions(select, 'chacha');

    expect(await within(dialog).findByText(/No administras esta sede/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Guardar horario' })).toBeDisabled();
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
    await user.click(screen.getAllByRole('button', { name: 'Editar' })[0]);
    const dialog = await screen.findByRole('dialog');
    return { user, dialog };
  }

  it('no guarda un especialista sin sede activa', async () => {
    const { user, dialog } = await openEdit();

    // Bagua está inactiva: quitar Chachapoyas y Jaén deja al especialista sin sede activa.
    await user.click(within(dialog).getByLabelText('Chachapoyas'));
    await user.click(within(dialog).getByLabelText('Jaén'));
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(within(dialog).getByText('Elige al menos una sede activa.')).toBeInTheDocument();
    expect(updateProfessional).not.toHaveBeenCalled();
  });
});

describe('ProfessionalsPage — filtros', () => {
  it('filtra por sede', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ProfessionalsPage />
      </MemoryRouter>,
    );
    expect(screen.getByText('Bea')).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Sede'), 'chacha');

    expect(screen.getByText('ANali')).toBeInTheDocument();
    expect(screen.queryByText('Bea')).not.toBeInTheDocument();
  });
});
