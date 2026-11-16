import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Modal from './Modal';

function renderLongModal(onSubmit = vi.fn((event: Event) => event.preventDefault())) {
  render(
    <Modal
      isOpen
      onClose={vi.fn()}
      title="Horario"
      footer={
        <>
          <button type="button">Cancelar</button>
          <button type="submit" form="horario-form">
            Guardar horario
          </button>
        </>
      }
    >
      <form id="horario-form" onSubmit={(event) => onSubmit(event.nativeEvent)}>
        {Array.from({ length: 14 }, (_, index) => (
          <p key={index}>Bloque {index + 1}</p>
        ))}
      </form>
    </Modal>,
  );
  return onSubmit;
}

describe('Modal', () => {
  it('deja el pie con los botones fuera de la zona con scroll', () => {
    renderLongModal();

    const body = screen.getByTestId('modal-body');
    const footer = screen.getByTestId('modal-footer');

    expect(body).toHaveClass('overflow-y-auto');
    expect(body).toContainElement(screen.getByText('Bloque 14'));
    expect(body).not.toContainElement(footer);
    expect(footer).toContainElement(screen.getByRole('button', { name: 'Guardar horario' }));
    expect(footer).toContainElement(screen.getByRole('button', { name: 'Cancelar' }));
  });

  it('la cabecera con el título y el botón cerrar queda fuera del scroll', () => {
    renderLongModal();

    const body = screen.getByTestId('modal-body');
    expect(body).not.toContainElement(screen.getByRole('heading', { name: 'Horario' }));
    expect(body).not.toContainElement(screen.getByRole('button', { name: 'Cerrar' }));
  });

  it('limita la altura a 90vh (100dvh en móvil)', () => {
    renderLongModal();

    expect(screen.getByRole('dialog')).toHaveClass('max-h-[100dvh]', 'sm:max-h-[90vh]', 'flex-col');
  });

  it('el botón del pie envía el formulario del cuerpo', async () => {
    const onSubmit = renderLongModal();

    await userEvent.click(screen.getByRole('button', { name: 'Guardar horario' }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
