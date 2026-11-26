import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import TeamPage from './TeamPage';
import { setProfessionalBranchActive } from '../../services/professionalService';
import { inviteInternalUser, setMemberBranches, setProfileActive } from '../../services/teamService';
import type { TeamMember } from '../../services/teamService';

const members: TeamMember[] = [
  {
    id: 'ana',
    fullName: 'ANali',
    email: 'ana@kristell.pe',
    role: 'especialista',
    active: true,
    branchIds: ['bagua', 'jaen'],
    branchNames: ['Bagua', 'Jaén'],
    branchesFromProfessionals: true,
    inactiveBranchIds: [],
    avatarPath: null,
  },
  {
    id: 'tere',
    fullName: 'Tere',
    email: 'tere@kristell.pe',
    role: 'tecnica',
    active: true,
    branchIds: ['jaen'],
    branchNames: ['Jaén'],
    branchesFromProfessionals: false,
    inactiveBranchIds: [],
    avatarPath: null,
  },
];

const access = vi.hoisted(() => ({ role: 'admin_global', branchIds: null as string[] | null }));

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

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'admin', role: access.role } }),
}));
vi.mock('../../hooks/useTeamMembers', () => ({
  useTeamMembers: () => ({ members, isLoading: false, error: null, refetch: vi.fn() }),
}));
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
vi.mock('../../services/professionalService', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../services/professionalService')>()),
  setProfessionalBranchActive: vi.fn(),
}));
vi.mock('../../services/teamService', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../services/teamService')>()),
  inviteInternalUser: vi.fn(),
  setMemberBranches: vi.fn(),
  setProfileActive: vi.fn(),
}));

function renderPage() {
  const user = userEvent.setup();
  render(
    <MemoryRouter>
      <TeamPage />
    </MemoryRouter>,
  );
  return user;
}

function cardOf(name: string): HTMLElement {
  return screen.getByText(name).closest('div.rounded-\\[14px\\]') as HTMLElement;
}

describe('TeamPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Element.prototype.scrollIntoView = vi.fn();
    access.role = 'admin_global';
    access.branchIds = null;
  });

  it('una profesional muestra sus sedes en solo lectura con "Ver ficha"', () => {
    renderPage();

    const card = cardOf('ANali');
    expect(within(card).getByText('Bagua, Jaén')).toBeInTheDocument();
    expect(within(card).getByText('Se asignan en Profesionales')).toBeInTheDocument();
    expect(within(card).getByRole('link', { name: 'Ver ficha' })).toHaveAttribute('href', '/admin/profesionales?ficha=ana');
    expect(within(card).queryByRole('button', { name: 'Editar sedes' })).not.toBeInTheDocument();
  });

  it('las sedes de una técnica se editan en Equipo', async () => {
    const user = renderPage();

    await user.click(within(cardOf('Tere')).getByRole('button', { name: 'Editar sedes' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('checkbox', { name: 'Bagua' }));
    await user.click(within(dialog).getByRole('button', { name: 'Guardar sedes' }));

    expect(setMemberBranches).toHaveBeenCalledWith('tere', ['jaen', 'bagua'], ['jaen']);
  });

  it('admin_sede solo cambia sus sedes de una técnica', async () => {
    access.role = 'admin_sede';
    access.branchIds = ['jaen'];
    const user = renderPage();

    await user.click(within(cardOf('Tere')).getByRole('button', { name: 'Editar sedes' }));
    const dialog = await screen.findByRole('dialog');

    expect(within(dialog).getByRole('checkbox', { name: /Bagua/ })).toBeDisabled();
    expect(within(dialog).getByRole('checkbox', { name: 'Jaén' })).toBeEnabled();
  });

  it('admin_sede desactiva la cuenta de una técnica de su sede', async () => {
    access.role = 'admin_sede';
    access.branchIds = ['jaen'];
    const user = renderPage();

    await user.click(within(cardOf('Tere')).getByRole('button', { name: 'Desactivar' }));

    expect(setProfileActive).toHaveBeenCalledWith('tere', false);
  });

  it('admin_sede desactiva solo en su sede a una profesional que atiende en varias', async () => {
    access.role = 'admin_sede';
    access.branchIds = ['jaen'];
    const user = renderPage();

    const anali = cardOf('ANali');
    expect(within(anali).queryByRole('button', { name: 'Desactivar' })).not.toBeInTheDocument();
    await user.click(within(anali).getByRole('button', { name: 'Desactivar en Jaén' }));

    expect(setProfessionalBranchActive).toHaveBeenCalledWith('ana', 'jaen', false);
    expect(setProfileActive).not.toHaveBeenCalled();
  });

  it('no ofrece crear una administradora global', async () => {
    const user = renderPage();

    await user.click(screen.getByRole('button', { name: 'Invitar usuario' }));
    const dialog = await screen.findByRole('dialog');
    const roles = within(within(dialog).getByLabelText('Rol')).getAllByRole('option').map((option) => option.textContent);

    expect(roles).not.toContain('Administrador global');
    expect(roles).toContain('Administrador de sede');
  });

  it('una administradora de sede se invita con una sola sede', async () => {
    vi.mocked(inviteInternalUser).mockResolvedValue({ id: 'nueva' });
    const user = renderPage();

    await user.click(screen.getByRole('button', { name: 'Invitar usuario' }));
    const dialog = await screen.findByRole('dialog');
    await user.selectOptions(within(dialog).getByLabelText('Rol'), 'admin_sede');
    await user.type(within(dialog).getByLabelText('Nombre completo'), 'Admin Jaén');
    await user.type(within(dialog).getByLabelText('Correo electrónico'), 'jaen@kristell.pe');

    expect(within(dialog).getByText('Sede que administra')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('radio', { name: 'Bagua' }));
    await user.click(within(dialog).getByRole('radio', { name: 'Jaén' }));
    expect(within(dialog).getByRole('radio', { name: 'Bagua' })).not.toBeChecked();
    await user.click(screen.getByRole('button', { name: 'Enviar invitación' }));

    expect(inviteInternalUser).toHaveBeenCalledWith(expect.objectContaining({ role: 'admin_sede', branchIds: ['jaen'] }));
  });

  it('no invita un correo que ya tiene cuenta', async () => {
    const user = renderPage();

    await user.click(screen.getByRole('button', { name: 'Invitar usuario' }));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText('Nombre completo'), 'Ana Lí');
    await user.type(within(dialog).getByLabelText('Correo electrónico'), ' ANA@kristell.pe ');
    await user.click(screen.getByRole('button', { name: 'Enviar invitación' }));

    expect(
      within(dialog).getByText('Ese correo ya tiene una cuenta. Para que atienda en otra sede, agrégala en Profesionales.'),
    ).toBeInTheDocument();
    expect(inviteInternalUser).not.toHaveBeenCalled();
  });

  it('filtra el equipo por nombre, rol y sede', async () => {
    const user = renderPage();

    await user.type(screen.getByLabelText('Buscar en el equipo'), 'tere');
    expect(screen.getByText('Tere')).toBeInTheDocument();
    expect(screen.queryByText('ANali')).not.toBeInTheDocument();

    await user.clear(screen.getByLabelText('Buscar en el equipo'));
    await user.click(screen.getByRole('tab', { name: /Especialista/ }));
    expect(screen.getByText('ANali')).toBeInTheDocument();
    expect(screen.queryByText('Tere')).not.toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: /Todos/ }));
    await user.selectOptions(screen.getByLabelText('Sede'), 'bagua');
    expect(screen.getByText('ANali')).toBeInTheDocument();
    expect(screen.queryByText('Tere')).not.toBeInTheDocument();
  });
});
