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
  it('la técnica ve la agenda de citas y la historia de paciente, sin los reportes de la profesional', async () => {
    access.role = 'tecnica';
    renderSidebar();

    await userEvent.click(screen.getByRole('button', { name: 'Imprimibles' }));

    expect(screen.getByRole('link', { name: 'Agenda de citas' })).toHaveAttribute('href', '/profesional/reportes/agenda');
    expect(screen.getByRole('link', { name: 'Historia de paciente' })).toHaveAttribute('href', '/profesional/reportes/historia');
    expect(screen.queryByRole('link', { name: 'Reporte de mis citas' })).not.toBeInTheDocument();
  });

  it.each(['especialista', 'odontologa_general'])('%s ve sus citas, sus pacientes y la historia, sin la agenda de la sede', async (role) => {
    access.role = role;
    renderSidebar();

    await userEvent.click(screen.getByRole('button', { name: 'Imprimibles' }));

    expect(screen.getByRole('link', { name: 'Reporte de mis citas' })).toHaveAttribute('href', '/profesional/reportes/mis-citas');
    expect(screen.getByRole('link', { name: 'Reporte de mis pacientes' })).toHaveAttribute(
      'href',
      '/profesional/reportes/mis-pacientes',
    );
    expect(screen.getByRole('link', { name: 'Historia de paciente' })).toHaveAttribute('href', '/profesional/reportes/historia');
    expect(screen.queryByRole('link', { name: 'Agenda de citas' })).not.toBeInTheDocument();
  });
});
