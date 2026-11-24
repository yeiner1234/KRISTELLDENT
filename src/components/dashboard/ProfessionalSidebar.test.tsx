import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import ProfessionalSidebar from './ProfessionalSidebar';

const access = vi.hoisted(() => ({ role: 'tecnica' }));

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'yo', name: 'Ana', role: access.role } }),
}));

function renderSidebar() {
  render(
    <MemoryRouter>
      <ProfessionalSidebar />
    </MemoryRouter>,
  );
}

describe('ProfessionalSidebar: Imprimibles', () => {
  it('la técnica la despliega y ve la agenda de citas', async () => {
    access.role = 'tecnica';
    renderSidebar();

    await userEvent.click(screen.getByRole('button', { name: 'Imprimibles' }));

    expect(screen.getByRole('link', { name: 'Agenda de citas' })).toHaveAttribute('href', '/profesional/reportes/agenda');
  });

  it.each(['especialista', 'odontologa_general'])('%s no tiene imprimibles', (role) => {
    access.role = role;
    renderSidebar();

    expect(screen.queryByRole('button', { name: 'Imprimibles' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Agenda de citas|imprimible/i })).not.toBeInTheDocument();
  });
});
