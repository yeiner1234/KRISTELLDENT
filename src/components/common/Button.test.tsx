import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import Button from './Button';

describe('Button', () => {
  it('llama a onClick al hacer clic y queda deshabilitado con disabled', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    const { rerender } = render(<Button onClick={onClick}>Reservar</Button>);

    await user.click(screen.getByRole('button', { name: 'Reservar' }));
    expect(onClick).toHaveBeenCalledTimes(1);

    rerender(
      <Button onClick={onClick} disabled>
        Reservar
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Reservar' });
    expect(button).toBeDisabled();
    await user.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
