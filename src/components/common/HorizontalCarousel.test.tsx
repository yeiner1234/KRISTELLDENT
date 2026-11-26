import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HorizontalCarousel from './HorizontalCarousel';

// jsdom no implementa el desplazamiento: se espía.
const scrollBy = vi.fn();
const scrollTo = vi.fn();

beforeEach(() => {
  Element.prototype.scrollBy = scrollBy;
  Element.prototype.scrollTo = scrollTo;
  // Fila de 1000 px de ancho visible con 3000 px de tarjetas.
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(1000);
  vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockReturnValue(3000);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

function renderCarousel() {
  return render(
    <HorizontalCarousel ariaLabel="Especialidades">
      {['Ortodoncia', 'Endodoncia', 'Cirugía'].map((name) => (
        <p key={name}>{name}</p>
      ))}
    </HorizontalCarousel>,
  );
}

describe('HorizontalCarousel', () => {
  it('pone todas las tarjetas en una sola fila deslizable de lado', () => {
    renderCarousel();

    const track = screen.getByRole('list', { name: 'Especialidades' });
    expect(within(track).getAllByRole('listitem')).toHaveLength(3);
    // Fila horizontal con desplazamiento y "imán" a cada tarjeta, nunca apiladas.
    expect(track).toHaveClass('flex', 'overflow-x-auto', 'snap-x', 'snap-mandatory');
    expect(track).not.toHaveClass('flex-col');
  });

  it('al empezar no hay nada a la izquierda: "Siguiente" avanza hacia la derecha', async () => {
    const user = userEvent.setup();
    renderCarousel();

    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));

    expect(scrollBy.mock.lastCall?.[0].left).toBeGreaterThan(0);
  });

  it('"Anterior" retrocede cuando ya se avanzó', async () => {
    const user = userEvent.setup();
    renderCarousel();
    const track = screen.getByRole('list', { name: 'Especialidades' });

    track.scrollLeft = 900;
    fireEvent.scroll(track);
    await user.click(screen.getByRole('button', { name: 'Anterior' }));

    expect(scrollBy.mock.lastCall?.[0].left).toBeLessThan(0);
  });

  it('si todas las tarjetas caben, no muestra flechas ni puntos', () => {
    vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockReturnValue(1000);
    renderCarousel();

    expect(screen.queryByRole('button', { name: 'Siguiente' })).not.toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Elegir tarjeta de Especialidades' })).not.toBeInTheDocument();
  });

  it('un punto por tarjeta; el primero marcado y cada uno lleva a su tarjeta', async () => {
    const user = userEvent.setup();
    renderCarousel();

    const dots = within(screen.getByRole('group', { name: 'Elegir tarjeta de Especialidades' })).getAllByRole('button');
    expect(dots).toHaveLength(3);
    expect(dots[0]).toHaveAttribute('aria-current', 'true');

    await user.click(dots[2]);
    expect(scrollTo).toHaveBeenCalled();
  });
});
