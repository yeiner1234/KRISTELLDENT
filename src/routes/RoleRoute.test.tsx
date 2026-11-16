import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import RoleRoute from './RoleRoute';
import { useAuth } from '../hooks/useAuth';
import type { AppRole } from '../types/User';

vi.mock('../hooks/useAuth', () => ({ useAuth: vi.fn() }));

function renderAt(path: string, role: AppRole | null) {
  vi.mocked(useAuth).mockReturnValue({
    user: role ? { id: 'u1', name: 'Ana', email: 'a@b.pe', role } : null,
    isLoading: false,
  } as never);

  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/login" element={<p>login</p>} />
        <Route element={<RoleRoute allowedRoles={['admin_global', 'admin_sede']} />}>
          <Route path="/admin/citas" element={<p>panel admin</p>} />
          <Route path="/admin" element={<p>inicio admin</p>} />
        </Route>
        <Route element={<RoleRoute allowedRoles={['especialista', 'odontologa_general', 'tecnica']} />}>
          <Route path="/profesional" element={<p>inicio profesional</p>} />
          <Route path="/profesional/agenda" element={<p>agenda profesional</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('RoleRoute', () => {
  it('un usuario de /profesional que entra a /admin vuelve a /profesional', () => {
    renderAt('/admin/citas', 'tecnica');
    expect(screen.getByText('inicio profesional')).toBeInTheDocument();
  });

  it('un admin que entra a /profesional vuelve a /admin', () => {
    renderAt('/profesional/agenda', 'admin_sede');
    expect(screen.getByText('inicio admin')).toBeInTheDocument();
  });

  it('sin sesión va a /login', () => {
    renderAt('/admin/citas', null);
    expect(screen.getByText('login')).toBeInTheDocument();
  });

  it('con el rol permitido muestra la página', () => {
    renderAt('/admin/citas', 'admin_sede');
    expect(screen.getByText('panel admin')).toBeInTheDocument();
  });
});
