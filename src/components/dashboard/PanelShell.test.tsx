import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';
import PanelShell from './PanelShell';

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'yo', name: 'Ana', role: 'admin_sede' }, logout: vi.fn() }),
}));

function renderShell() {
  render(
    <MemoryRouter initialEntries={['/admin']}>
      <Routes>
        <Route
          path="/admin/*"
          element={
            <PanelShell
              heading="Panel administrativo"
              variant="admin"
              mainClassName=""
              sidebar={
                <nav>
                  <Link to="/admin/citas">Citas</Link>
                </nav>
              }
            >
              <Routes>
                <Route index element={<p>Inicio del panel</p>} />
                <Route path="citas" element={<p>Lista de citas</p>} />
              </Routes>
            </PanelShell>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

const menu = () => document.getElementById('panel-menu') as HTMLElement;
const menuButton = () => screen.getByRole('button', { name: /menú/ });

async function openMenu() {
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Abrir menú' }));
  return user;
}

describe('PanelShell (menú móvil)', () => {
  it('empieza cerrado y el botón de menú lo abre', async () => {
    renderShell();

    expect(menu()).toHaveAttribute('data-open', 'false');
    // Fondo propio para lo que no cabe en pantallas bajas; en escritorio, transparente.
    expect(menu()).toHaveClass('overflow-y-auto', 'bg-brand-900', 'lg:bg-transparent');
    // En escritorio el menú queda quieto mientras la página hace scroll.
    expect(menu()).toHaveClass('lg:sticky', 'lg:top-0', 'lg:h-screen');
    expect(menuButton()).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByTestId('panel-menu-backdrop')).not.toBeInTheDocument();

    await openMenu();

    expect(menu()).toHaveAttribute('data-open', 'true');
    expect(menuButton()).toHaveAttribute('aria-expanded', 'true');
    expect(menuButton()).toHaveAccessibleName('Cerrar menú');
    expect(screen.getByTestId('panel-menu-backdrop')).toBeInTheDocument();
  });

  it('se cierra con Escape', async () => {
    renderShell();
    const user = await openMenu();

    await user.keyboard('{Escape}');

    expect(menu()).toHaveAttribute('data-open', 'false');
    expect(screen.queryByTestId('panel-menu-backdrop')).not.toBeInTheDocument();
  });

  it('se cierra al tocar afuera (el fondo oscuro)', async () => {
    renderShell();
    const user = await openMenu();

    await user.click(screen.getByTestId('panel-menu-backdrop'));

    expect(menu()).toHaveAttribute('data-open', 'false');
  });

  it('se cierra al elegir una opción y navega a ella', async () => {
    renderShell();
    const user = await openMenu();

    await user.click(screen.getByRole('link', { name: 'Citas' }));

    expect(menu()).toHaveAttribute('data-open', 'false');
    expect(screen.getByText('Lista de citas')).toBeInTheDocument();
  });

  it('la cabecera muestra el nombre de la sección actual', async () => {
    renderShell();
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent('Dashboard');

    const user = await openMenu();
    await user.click(screen.getByRole('link', { name: 'Citas' }));

    expect(heading).toHaveTextContent('Citas');
  });
});
