import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import ProfessionalsPage from './ProfessionalsPage';
import { getProfessionalScheduleForAdmin, setProfessionalSchedule } from '../../services/professionalScheduleService';
import { getBranchScheduleForAdmin } from '../../services/branchScheduleService';
import {
  addProfessionalToBranch,
  removeProfessionalFromBranch,
  setProfessionalBranchServices,
} from '../../services/professionalService';
import { searchProfessionalsDirectory } from '../../services/offerService';
import type { AdminProfessional } from '../../types/Professional';
import type { Service } from '../../types/Service';

const anali: AdminProfessional = {
  id: 'anali',
  fullName: 'ANali',
  role: 'especialista',
  bio: null,
  active: true,
  specialtyIds: ['endo'],
  branchIds: ['bagua', 'chacha', 'jaen'],
  serviceIds: ['conducto-jaen'],
  assignments: [{ serviceId: 'conducto-jaen', branchId: 'jaen' }],
  scheduleBranchIds: ['jaen'],
};

// Solo en Bagua (inactiva): no tiene botón Horario.
const bea: AdminProfessional = {
  ...anali,
  id: 'bea',
  fullName: 'Bea',
  branchIds: ['bagua'],
  serviceIds: [],
  assignments: [],
  scheduleBranchIds: [],
};

// null = admin_global (todas las sedes); una lista = admin_sede.
const access = vi.hoisted(() => ({ branchIds: null as string[] | null, role: 'admin_global' }));

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

const service = (id: string, name: string, branchId: string): Service => ({
  id,
  name,
  specialtyId: 'endo',
  branchId,
  duration: 60,
  price: 150,
  active: true,
});

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'yo', role: access.role } }),
}));
vi.mock('../../hooks/useAdminProfessionals', () => ({
  useAdminProfessionals: () => ({ professionals: [anali, bea], isLoading: false, error: null, refetch: vi.fn() }),
}));
vi.mock('../../hooks/useAdminSpecialties', () => ({
  useAdminSpecialties: () => ({
    specialties: [
      { id: 'endo', name: 'Endodoncia', description: null, active: true },
      { id: 'orto', name: 'Ortodoncia', description: null, active: true },
    ],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));
vi.mock('../../hooks/useAdminServices', () => ({
  useAdminServices: () => ({
    services: [
      service('conducto-jaen', 'Conducto', 'jaen'),
      service('blanqueo-jaen', 'Blanqueo interno', 'jaen'),
      service('conducto-chacha', 'Conducto', 'chacha'),
    ],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
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
vi.mock('../../services/offerService', () => ({ searchProfessionalsDirectory: vi.fn() }));
vi.mock('../../services/professionalService', () => ({
  addProfessionalToBranch: vi.fn(),
  createProfessional: vi.fn(),
  getEligibleProfilesForProfessional: vi.fn().mockResolvedValue([]),
  removeProfessionalFromBranch: vi.fn(),
  setProfessionalActive: vi.fn(),
  setProfessionalBranchServices: vi.fn(),
  updateProfessionalProfile: vi.fn(),
}));

function renderPage() {
  const user = userEvent.setup();
  render(
    <MemoryRouter>
      <ProfessionalsPage />
    </MemoryRouter>,
  );
  return user;
}

async function openSchedule() {
  const user = renderPage();
  await user.click(screen.getByRole('button', { name: 'Horario' }));
  const dialog = await screen.findByRole('dialog');
  await within(dialog).findByLabelText('Lunes, inicio del bloque 1');
  return { user, dialog };
}

async function openProfile(name = 'ANali') {
  const user = renderPage();
  const card = screen.getByText(name).closest('div.flex.flex-col.gap-2') as HTMLElement;
  await user.click(within(card).getByRole('button', { name: 'Editar' }));
  const dialog = await screen.findByRole('dialog');
  return { user, dialog };
}

function asAdminSede(branchIds: string[]) {
  access.role = 'admin_sede';
  access.branchIds = branchIds;
}

beforeEach(() => {
  vi.clearAllMocks();
  Element.prototype.scrollIntoView = vi.fn();
  access.role = 'admin_global';
  access.branchIds = null;
});

describe('ProfessionalsPage — modal Horario', () => {
  beforeEach(() => {
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
    const user = renderPage();
    await user.click(screen.getByRole('button', { name: 'Horario' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('sin red');
    expect(screen.getByRole('button', { name: 'Guardar horario' })).toBeDisabled();
  });
});

describe('ProfessionalsPage — horario para admin_sede', () => {
  beforeEach(() => {
    vi.mocked(getProfessionalScheduleForAdmin).mockResolvedValue([{ dayOfWeek: 1, startTime: '09:00', endTime: '13:00' }]);
    vi.mocked(getBranchScheduleForAdmin).mockResolvedValue([]);
    asAdminSede(['jaen']);
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

describe('ProfessionalsPage — ficha por sede', () => {
  it('admin_sede: la especialidad de una especialista es de solo lectura', async () => {
    asAdminSede(['jaen']);
    const { dialog } = await openProfile();

    expect(within(dialog).queryByRole('radio')).not.toBeInTheDocument();
    expect(within(dialog).getByText(/Solo la administración general cambia la especialidad/)).toBeInTheDocument();
  });

  it('admin_global sí elige la especialidad de una especialista', async () => {
    const { dialog } = await openProfile();

    expect(within(dialog).getByRole('radio', { name: 'Endodoncia' })).toBeChecked();
  });

  it('en su sede elige los servicios de esa sede y guarda solo esa sede', async () => {
    asAdminSede(['jaen']);
    const { user, dialog } = await openProfile();

    await user.click(within(dialog).getByRole('tab', { name: 'Jaén' }));
    // Solo los servicios de Jaén, no el "Conducto" de Chachapoyas.
    expect(within(dialog).getAllByRole('checkbox')).toHaveLength(2);
    await user.click(within(dialog).getByRole('checkbox', { name: /Blanqueo interno/ }));
    await user.click(within(dialog).getByRole('button', { name: 'Guardar servicios' }));

    expect(setProfessionalBranchServices).toHaveBeenCalledWith('anali', ['conducto-jaen', 'blanqueo-jaen'], ['conducto-jaen']);
  });

  it('una sede ajena se ve en solo lectura', async () => {
    asAdminSede(['jaen']);
    const { user, dialog } = await openProfile();

    await user.click(within(dialog).getByRole('tab', { name: 'Chachapoyas' }));

    expect(within(dialog).getByText(/No administras esta sede/)).toBeInTheDocument();
    expect(within(dialog).getByRole('checkbox', { name: /Conducto/ })).toBeDisabled();
    expect(within(dialog).queryByRole('button', { name: 'Guardar servicios' })).not.toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: 'Quitar de esta sede' })).not.toBeInTheDocument();
  });

  it('quitar de la sede pide confirmación y muestra el error de citas pendientes', async () => {
    asAdminSede(['jaen']);
    vi.mocked(removeProfessionalFromBranch).mockRejectedValue(
      new Error('Tiene 1 cita pendiente en esta sede: reprográmala o cancélala antes de quitarla.'),
    );
    const { user, dialog } = await openProfile();

    await user.click(within(dialog).getByRole('tab', { name: 'Jaén' }));
    await user.click(within(dialog).getByRole('button', { name: 'Quitar de esta sede' }));
    await user.click(within(dialog).getByRole('button', { name: 'Sí, quitar' }));

    expect(removeProfessionalFromBranch).toHaveBeenCalledWith('anali', 'jaen');
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Tiene 1 cita pendiente en esta sede');
  });

  it('admin_sede no ve "Desactivar ficha"; admin_global sí', async () => {
    asAdminSede(['jaen']);
    const { unmount } = render(
      <MemoryRouter>
        <ProfessionalsPage />
      </MemoryRouter>,
    );
    expect(screen.queryByRole('button', { name: 'Desactivar ficha' })).not.toBeInTheDocument();
    unmount();

    access.role = 'admin_global';
    access.branchIds = null;
    renderPage();
    expect(screen.getAllByRole('button', { name: 'Desactivar ficha' }).length).toBeGreaterThan(0);
  });

  it('marca la ficha incompleta con lo que falta en cada sede', () => {
    renderPage();

    expect(screen.getByText(/Chachapoyas: falta servicios y horario/)).toBeInTheDocument();
  });
});

describe('ProfessionalsPage — agregar profesional a mi sede', () => {
  it('busca en el directorio y la suma a su sede', async () => {
    asAdminSede(['jaen']);
    vi.mocked(searchProfessionalsDirectory).mockResolvedValue([
      {
        id: 'carla',
        fullName: 'Carla Díaz',
        role: 'odontologa_general',
        specialtyNames: ['Endodoncia'],
        branchIds: ['bagua'],
        branchNames: ['Bagua'],
      },
    ]);
    const user = renderPage();

    await user.click(screen.getByRole('button', { name: 'Agregar profesional a mi sede' }));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText('Nombre de la profesional'), 'carla');
    await user.click(within(dialog).getByRole('button', { name: 'Buscar' }));
    await user.click(await within(dialog).findByRole('button', { name: 'Agregar a Jaén' }));

    expect(searchProfessionalsDirectory).toHaveBeenCalledWith('carla');
    expect(addProfessionalToBranch).toHaveBeenCalledWith('carla', 'jaen');
    expect(await within(dialog).findByText(/Carla Díaz ahora atiende también en Jaén/)).toBeInTheDocument();
  });
});

describe('ProfessionalsPage — filtros', () => {
  it('filtra por sede', async () => {
    const user = renderPage();
    expect(screen.getByText('Bea')).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Sede'), 'chacha');

    expect(screen.getByText('ANali')).toBeInTheDocument();
    expect(screen.queryByText('Bea')).not.toBeInTheDocument();
  });

  it('admin_sede solo ve las profesionales de sus sedes', () => {
    asAdminSede(['jaen']);
    renderPage();

    expect(screen.getByText('ANali')).toBeInTheDocument();
    expect(screen.queryByText('Bea')).not.toBeInTheDocument();
  });
});
