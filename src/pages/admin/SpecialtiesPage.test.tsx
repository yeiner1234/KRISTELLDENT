import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SpecialtiesPage from './SpecialtiesPage';
import { createSpecialty } from '../../services/specialtyService';

const access = vi.hoisted(() => ({ role: 'admin_sede' }));
const refetch = vi.hoisted(() => vi.fn());

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'yo', role: access.role } }),
}));
vi.mock('../../hooks/useOffer', () => ({
  useSpecialtiesAdmin: () => ({
    data: [
      {
        id: 'rehab',
        name: 'Rehabilitación oral',
        description: null,
        active: true,
        createdByName: 'Admin Jaén',
        branchNames: ['Jaén'],
      },
    ],
    isLoading: false,
    error: null,
    refetch,
  }),
}));
vi.mock('../../services/specialtyService', () => ({
  createSpecialty: vi.fn(),
  deleteSpecialty: vi.fn(),
  setSpecialtyActive: vi.fn(),
  updateSpecialty: vi.fn(),
}));

describe('SpecialtiesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('muestra en qué sedes se ofrece y quién la agregó', () => {
    access.role = 'admin_sede';
    render(<SpecialtiesPage />);

    expect(screen.getByText('Jaén')).toBeInTheDocument();
    expect(screen.getByText('Admin Jaén')).toBeInTheDocument();
  });

  it('admin_sede agrega pero no edita, desactiva ni borra', () => {
    access.role = 'admin_sede';
    render(<SpecialtiesPage />);

    expect(screen.getByRole('button', { name: 'Agregar especialidad' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Desactivar' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Borrar/ })).not.toBeInTheDocument();
  });

  it('admin_global además edita, desactiva y borra', () => {
    access.role = 'admin_global';
    render(<SpecialtiesPage />);

    expect(screen.getByRole('button', { name: 'Editar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Desactivar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Borrar Rehabilitación oral' })).toBeInTheDocument();
  });

  it('no deja agregar la misma especialidad escrita distinto', async () => {
    access.role = 'admin_sede';
    const user = userEvent.setup();
    render(<SpecialtiesPage />);

    await user.click(screen.getByRole('button', { name: 'Agregar especialidad' }));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText('Nombre'), 'rehabilitacion  oral');

    expect(within(dialog).getByText(/Ya existe "Rehabilitación oral"/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(createSpecialty).not.toHaveBeenCalled();
  });

  it('sugiere una parecida antes de agregar', async () => {
    access.role = 'admin_sede';
    const user = userEvent.setup();
    render(<SpecialtiesPage />);

    await user.click(screen.getByRole('button', { name: 'Agregar especialidad' }));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText('Nombre'), 'Rehabilitacion');

    expect(within(dialog).getByText(/¿Quisiste decir "Rehabilitación oral"\?/)).toBeInTheDocument();
  });

  it('agrega una especialidad nueva, cierra el formulario y recarga la lista', async () => {
    access.role = 'admin_sede';
    vi.mocked(createSpecialty).mockResolvedValue({ id: 'perio', name: 'Periodoncia', description: null, active: true });
    const user = userEvent.setup();
    render(<SpecialtiesPage />);

    await user.click(screen.getByRole('button', { name: 'Agregar especialidad' }));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText('Nombre'), 'Periodoncia');
    await user.type(within(dialog).getByLabelText('Descripción (opcional)'), 'Encías');
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(createSpecialty).toHaveBeenCalledWith({ name: 'Periodoncia', description: 'Encías' });
    expect(refetch).toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('si la base rechaza el alta, muestra el error y deja el formulario abierto', async () => {
    access.role = 'admin_sede';
    vi.mocked(createSpecialty).mockRejectedValue(new Error('Ya existe esa especialidad: elígela de la lista.'));
    const user = userEvent.setup();
    render(<SpecialtiesPage />);

    await user.click(screen.getByRole('button', { name: 'Agregar especialidad' }));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText('Nombre'), 'Periodoncia');
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Ya existe esa especialidad');
    expect(refetch).not.toHaveBeenCalled();
  });
});
