import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Input from './Input';

describe('Input de contraseña', () => {
  it('empieza oculta y el ojo la muestra y la vuelve a ocultar', async () => {
    const user = userEvent.setup();
    render(<Input label="Contraseña" type="password" variant="admin" defaultValue="secreta123" />);

    const field = screen.getByLabelText('Contraseña');
    expect(field).toHaveAttribute('type', 'password');

    await user.click(screen.getByRole('button', { name: 'Mostrar contraseña' }));
    expect(field).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: 'Ocultar contraseña' })).toHaveAttribute('aria-pressed', 'true');

    await user.click(screen.getByRole('button', { name: 'Ocultar contraseña' }));
    expect(field).toHaveAttribute('type', 'password');
  });

  it('el ojo no envía el formulario', async () => {
    const user = userEvent.setup();
    let submitted = false;
    render(
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submitted = true;
        }}
      >
        <Input label="Contraseña" type="password" />
      </form>,
    );

    await user.click(screen.getByRole('button', { name: 'Mostrar contraseña' }));

    expect(submitted).toBe(false);
  });

  it('los demás campos no llevan ojo', () => {
    render(<Input label="Correo" type="email" />);

    expect(screen.getByLabelText('Correo')).toHaveAttribute('type', 'email');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
