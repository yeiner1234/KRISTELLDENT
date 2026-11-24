import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import ServicesPage from './ServicesPage';
import { createService } from '../../services/serviceService';
import { createSpecialty } from '../../services/specialtyService';
import type { ServiceOfferStatus } from '../../types/Offer';

const access = vi.hoisted(() => ({ branchIds: ['jaen'] as string[] | null }));

const branch = (id: string, name: string) => ({
  id,
  name,
  address: '',
  region: null,
  googleMapsAddress: null,
  phone: null,
  lat: null,
  lng: null,
  active: true,
  createdAt: '',
  updatedAt: '',
});

const row = (overrides: Partial<ServiceOfferStatus>): ServiceOfferStatus => ({
  serviceId: 's1',
  name: 'Control de ortodoncia',
  specialtyId: 'orto',
  specialtyName: 'Ortodoncia',
  specialtyActive: true,
  price: 80,
  duration: 30,
  active: true,
  professionals: [],
  bookable: false,
  reason: 'No visible en reservas: falta asignar una profesional.',
  ...overrides,
});

const specialtiesRefetch = vi.hoisted(() => vi.fn());
const offer = vi.hoisted(() => ({ rows: [] as ServiceOfferStatus[], requested: [] as (string | null)[] }));

vi.mock('../../hooks/useAdminBranches', () => ({
  useAdminBranches: () => ({
    branches: [branch('bagua', 'Bagua'), branch('jaen', 'Jaén')],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));
vi.mock('../../hooks/useManageableBranchIds', () => ({
  useManageableBranchIds: () => ({ branchIds: access.branchIds, isLoading: false, error: null }),
}));
vi.mock('../../hooks/useAdminSpecialties', () => ({
  useAdminSpecialties: () => ({
    specialties: [
      { id: 'orto', name: 'Ortodoncia', description: null, active: true },
      { id: 'endo', name: 'Endodoncia', description: null, active: true },
    ],
    isLoading: false,
    error: null,
    refetch: specialtiesRefetch,
  }),
}));
vi.mock('../../hooks/useOffer', () => ({
  useBranchOfferStatus: (branchId: string | null) => {
    offer.requested.push(branchId);
    return { data: offer.rows, isLoading: false, error: null, refetch: vi.fn() };
  },
}));
vi.mock('../../services/serviceService', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../services/serviceService')>()),
  createService: vi.fn(),
  updateService: vi.fn(),
  setServiceActive: vi.fn(),
}));
vi.mock('../../services/specialtyService', () => ({ createSpecialty: vi.fn() }));

function renderPage() {
  const user = userEvent.setup();
  render(
    <MemoryRouter>
      <ServicesPage />
    </MemoryRouter>,
  );
  return user;
}

describe('ServicesPage — servicios de la sede', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Element.prototype.scrollIntoView = vi.fn();
    access.branchIds = ['jaen'];
    offer.rows = [];
    offer.requested = [];
  });

  it('admin_sede solo elige entre sus sedes y carga la suya', () => {
    renderPage();

    const select = screen.getByLabelText('Sede');
    expect(within(select).getAllByRole('option').map((option) => option.textContent)).toEqual(['Jaén']);
    expect(offer.requested).toContain('jaen');
  });

  it('un servicio activo sin profesional muestra por qué no se ve en la reserva', () => {
    offer.rows = [row({})];
    renderPage();

    expect(screen.getByText('No visible en reservas')).toBeInTheDocument();
    expect(screen.getByText('Falta asignar una profesional.')).toBeInTheDocument();
    expect(screen.getByText(/Todavía ninguna/)).toBeInTheDocument();
  });

  it('las especialidades de la sede salen de sus servicios visibles', () => {
    offer.rows = [
      row({ bookable: true, reason: null, professionals: [{ id: 'a', fullName: 'ANali', active: true, accountActive: true, recordActive: true, branchActive: true, hasSchedule: true, bookable: true }] }),
      row({ serviceId: 's2', name: 'Conducto', specialtyId: 'endo', specialtyName: 'Endodoncia' }),
    ];
    renderPage();

    expect(screen.getByText('Visible en reservas')).toBeInTheDocument();
    const chips = screen.getByText('Especialidades de esta sede').parentElement as HTMLElement;
    expect(within(chips).getByText('Ortodoncia')).toBeInTheDocument();
    expect(within(chips).queryByText('Endodoncia')).not.toBeInTheDocument();
  });

  it('crea el servicio en su sede con su precio y duración', async () => {
    vi.mocked(createService).mockResolvedValue({} as never);
    const user = renderPage();

    await user.click(screen.getByRole('button', { name: 'Nuevo servicio' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Jaén')).toBeInTheDocument();
    await user.type(within(dialog).getByLabelText('Nombre del servicio'), 'Control de ortodoncia');
    await user.click(within(dialog).getByRole('radio', { name: 'Ortodoncia' }));
    await user.type(within(dialog).getByLabelText('Precio (S/)'), '80');
    await user.clear(within(dialog).getByLabelText('Duración (minutos)'));
    await user.type(within(dialog).getByLabelText('Duración (minutos)'), '45');
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(createService).toHaveBeenCalledWith({
      branchId: 'jaen',
      name: 'Control de ortodoncia',
      specialtyId: 'orto',
      price: 80,
      duration: 45,
    });
  });

  it('al escribir una especialidad parecida a una existente sugiere elegirla', async () => {
    const user = renderPage();

    await user.click(screen.getByRole('button', { name: 'Nuevo servicio' }));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText('Buscar especialidad'), 'Ortodoncai');

    expect(within(dialog).getByText('¿Quisiste decir')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Ortodoncia' }));
    expect(within(dialog).getByRole('radio', { name: 'Ortodoncia' })).toBeChecked();
  });

  it('el error de la base se muestra tal cual', async () => {
    vi.mocked(createService).mockRejectedValue(new Error('Esta sede ya tiene un servicio con ese nombre.'));
    const user = renderPage();

    await user.click(screen.getByRole('button', { name: 'Nuevo servicio' }));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText('Nombre del servicio'), 'control de ortodoncia');
    await user.click(within(dialog).getByRole('radio', { name: 'Ortodoncia' }));
    await user.type(within(dialog).getByLabelText('Precio (S/)'), '50');
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Esta sede ya tiene un servicio con ese nombre.');
  });

  it('agrega una especialidad nueva desde el formulario y crea el servicio con ella', async () => {
    vi.mocked(createSpecialty).mockResolvedValue({ id: 'perio', name: 'Periodoncia', description: null, active: true });
    vi.mocked(createService).mockResolvedValue({} as never);
    const user = renderPage();

    await user.click(screen.getByRole('button', { name: 'Nuevo servicio' }));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText('Nombre del servicio'), 'Limpieza profunda');
    await user.type(within(dialog).getByLabelText('Buscar especialidad'), 'Periodoncia');
    await user.click(within(dialog).getByRole('button', { name: 'Agregar especialidad "Periodoncia"' }));

    expect(createSpecialty).toHaveBeenCalledWith({ name: 'Periodoncia', description: null });
    expect(specialtiesRefetch).toHaveBeenCalled();

    await user.type(within(dialog).getByLabelText('Precio (S/)'), '120');
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(createService).toHaveBeenCalledWith({
      branchId: 'jaen',
      name: 'Limpieza profunda',
      specialtyId: 'perio',
      price: 120,
      duration: 30,
    });
  });
});
