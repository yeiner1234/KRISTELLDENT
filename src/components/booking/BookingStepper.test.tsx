import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import BookingStepper from './BookingStepper';

describe('BookingStepper', () => {
  it('en celular resume el paso actual con su nombre y una barra de progreso', () => {
    render(<BookingStepper currentStep={3} />);

    const compact = screen.getByTestId('booking-stepper-compact');
    expect(compact).toHaveClass('lg:hidden');
    expect(compact).toHaveTextContent('Paso 3 de 8 · Profesional');

    const progress = screen.getByRole('progressbar', { name: 'Progreso de la reserva' });
    expect(progress).toHaveAttribute('aria-valuenow', '3');
    expect(progress).toHaveAttribute('aria-valuemax', '8');
    expect(screen.getByTestId('booking-stepper-bar')).toHaveStyle({ width: '37.5%' });
  });

  it('desde lg muestra los 8 pasos', () => {
    render(<BookingStepper currentStep={1} />);

    const list = screen.getByRole('list', { name: 'Paso 1 de 8' });
    expect(list).toHaveClass('hidden', 'lg:flex');
    expect(screen.getAllByRole('listitem')).toHaveLength(8);
  });

  it('en el último paso la barra está completa', () => {
    render(<BookingStepper currentStep={8} />);

    expect(screen.getByTestId('booking-stepper-compact')).toHaveTextContent('Paso 8 de 8 · Confirmación');
    expect(screen.getByTestId('booking-stepper-bar')).toHaveStyle({ width: '100%' });
  });
});
