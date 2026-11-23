import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TeamPage from './TeamPage';
import { inviteInternalUser } from '../../services/teamService';
import type { TeamMember } from '../../services/teamService';

const members: TeamMember[] = [
  {
    id: 'ana',
    fullName: 'ANali',
    email: 'ana@kristell.pe',
    role: 'especialista',
    active: true,
    branchNames: ['Bagua', 'Jaén'],
    branchesFromProfessionals: true,
  },
  {
    id: 'tere',
    fullName: 'Tere',
    email: 'tere@kristell.pe',
    role: 'tecnica',
    active: true,
    branchNames: ['Jaén'],
    branchesFromProfessionals: false,
  },
];

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'admin', role: 'admin_global' } }),
}));
vi.mock('../../hooks/useTeamMembers', () => ({
  useTeamMembers: () => ({ members, isLoading: false, error: null, refetch: vi.fn() }),
}));
vi.mock('../../hooks/useAdminBranches', () => ({
  useAdminBranches: () => ({ branches: [], isLoading: false, error: null, refetch: vi.fn() }),
}));
vi.mock('../../services/teamService', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../services/teamService')>()),
  inviteInternalUser: vi.fn(),
  setProfileActive: vi.fn(),
}));

describe('TeamPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('para una profesional indica que sus sedes se asignan en Profesionales', () => {
    render(<TeamPage />);

    expect(screen.getByText('Bagua, Jaén')).toBeInTheDocument();
    expect(screen.getAllByText('Se asignan en Profesionales')).toHaveLength(1);
  });

  it('no invita un correo que ya tiene cuenta', async () => {
    const user = userEvent.setup();
    render(<TeamPage />);

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
});
