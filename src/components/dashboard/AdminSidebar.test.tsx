import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';

const access = vi.hoisted(() => ({ role: 'admin_sede' }));

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'yo', role: access.role } }),
}));

function renderSidebar() {
  render(
    <MemoryRouter>
      <AdminSidebar />
    </MemoryRouter>,
  );
}

describe('AdminSidebar', () => {
  it('admin_sede no ve "Oferta por sede"', () => {
    access.role = 'admin_sede';
    renderSidebar();

    expect(screen.getByRole('link', { name: /Servicios de la sede/ })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Oferta por sede/ })).not.toBeInTheDocument();
  });

  it('admin_global sí la ve', () => {
    access.role = 'admin_global';
    renderSidebar();

    expect(screen.getByRole('link', { name: /Oferta por sede/ })).toBeInTheDocument();
  });
});
