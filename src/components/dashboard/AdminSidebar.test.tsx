import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';

const access = vi.hoisted(() => ({ role: 'admin_sede' }));

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'yo', role: access.role } }),
}));

function renderSidebar() {
  return render(
    <MemoryRouter>
      <AdminSidebar />
    </MemoryRouter>,
  );
}

describe('AdminSidebar', () => {
  it('ningún rol ve "Oferta por sede" (se quitó)', () => {
    for (const role of ['admin_sede', 'admin_global']) {
      access.role = role;
      const { unmount } = renderSidebar();

      expect(screen.getByRole('link', { name: /Servicios de la sede/ })).toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /Oferta por sede/ })).not.toBeInTheDocument();
      unmount();
    }
  });
});

describe('AdminSidebar: Imprimibles', () => {
  it('es una sección cerrada que se despliega con la agenda de citas', async () => {
    access.role = 'admin_sede';
    renderSidebar();

    const toggle = screen.getByRole('button', { name: 'Imprimibles' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('link', { name: 'Agenda de citas' })).not.toBeInTheDocument();

    await userEvent.click(toggle);

    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('link', { name: 'Agenda de citas' })).toHaveAttribute('href', '/admin/reportes/agenda');
    expect(screen.getByRole('link', { name: 'Reporte de citas' })).toHaveAttribute('href', '/admin/reportes/citas');
    expect(screen.getByRole('link', { name: 'Reporte de pacientes' })).toHaveAttribute('href', '/admin/reportes/pacientes');
    expect(screen.getByRole('link', { name: 'Reporte de desempeño' })).toHaveAttribute('href', '/admin/reportes/desempeno');
    expect(screen.getByRole('link', { name: 'Reporte de ingresos' })).toHaveAttribute('href', '/admin/reportes/ingresos');

    await userEvent.click(toggle);
    expect(screen.queryByRole('link', { name: 'Agenda de citas' })).not.toBeInTheDocument();
  });

  it('empieza abierta y marcada si estás en un imprimible', () => {
    access.role = 'admin_global';
    render(
      <MemoryRouter initialEntries={['/admin/reportes/agenda']}>
        <AdminSidebar />
      </MemoryRouter>,
    );

    expect(screen.getByRole('button', { name: 'Imprimibles' })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('link', { name: 'Agenda de citas' })).toHaveClass('bg-brand-600');
  });
});
