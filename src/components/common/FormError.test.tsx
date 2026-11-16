import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import FormError from './FormError';

describe('FormError', () => {
  it('muestra el mensaje y lo lleva a la vista', () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;

    render(<FormError message="Lunes: Los rangos se cruzan." />);

    expect(screen.getByRole('alert')).toHaveTextContent('Lunes: Los rangos se cruzan.');
    expect(scrollIntoView).toHaveBeenCalled();
  });

  it('sin mensaje no muestra nada', () => {
    const { container } = render(<FormError message={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});
