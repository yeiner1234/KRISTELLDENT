import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import LoginPage from './LoginPage';
import { useAuth } from '../../hooks/useAuth';
import { REMEMBER_ME_KEY } from '../../utils/authStorage';

vi.mock('../../hooks/useAuth', () => ({ useAuth: vi.fn() }));

const login = vi.fn();

function renderLogin() {
  render(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/admin" element={<p>panel admin</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  sessionStorage.clear();
  vi.mocked(useAuth).mockReturnValue({ login, sessionError: null } as unknown as ReturnType<typeof useAuth>);
});

describe('LoginPage', () => {
  it('muestra los campos de correo y contraseña', () => {
    renderLogin();

    expect(screen.getByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument();
    expect(screen.getByLabelText('Correo electrónico')).toHaveAttribute('placeholder', 'nombre@kristelldent.com');
    expect(screen.getByLabelText('Contraseña')).toHaveAttribute('type', 'password');
    expect(screen.getByRole('button', { name: 'Iniciar sesión' })).toBeInTheDocument();
    expect(screen.queryByText(/sede/i)).not.toBeInTheDocument();
  });

  it('el ojo muestra y oculta la contraseña', async () => {
    const user = userEvent.setup();
    renderLogin();
    const password = screen.getByLabelText('Contraseña');

    await user.click(screen.getByRole('button', { name: 'Mostrar contraseña' }));
    expect(password).toHaveAttribute('type', 'text');

    await user.click(screen.getByRole('button', { name: 'Ocultar contraseña' }));
    expect(password).toHaveAttribute('type', 'password');
  });

  it('el enlace de recuperar apunta a /login/recuperar', () => {
    renderLogin();

    expect(screen.getByRole('link', { name: '¿Olvidaste tu contraseña?' })).toHaveAttribute('href', '/login/recuperar');
  });

  it('Recordarme guarda su estado y lo recuerda al volver', async () => {
    const user = userEvent.setup();
    renderLogin();
    const remember = screen.getByRole('checkbox', { name: 'Recordarme' });
    expect(remember).toBeChecked();

    await user.click(remember);
    expect(remember).not.toBeChecked();
    expect(localStorage.getItem(REMEMBER_ME_KEY)).toBe('false');
  });

  it('arranca con Recordarme desmarcado si así se eligió', () => {
    localStorage.setItem(REMEMBER_ME_KEY, 'false');
    renderLogin();

    expect(screen.getByRole('checkbox', { name: 'Recordarme' })).not.toBeChecked();
  });

  it('el envío llama al login con correo y contraseña y redirige por rol', async () => {
    login.mockResolvedValue({ id: 'u1', role: 'admin_global' });
    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByLabelText('Correo electrónico'), 'ana@kristelldent.com');
    await user.type(screen.getByLabelText('Contraseña'), 'secreta123');
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }));

    expect(login).toHaveBeenCalledWith({ email: 'ana@kristelldent.com', password: 'secreta123' });
    expect(await screen.findByText('panel admin')).toBeInTheDocument();
  });

  it('muestra el error del login dentro de la tarjeta', async () => {
    login.mockRejectedValue(new Error('Correo o contraseña incorrectos.'));
    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByLabelText('Correo electrónico'), 'ana@kristelldent.com');
    await user.type(screen.getByLabelText('Contraseña'), 'mala');
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Correo o contraseña incorrectos.');
  });
});
