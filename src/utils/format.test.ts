import { describe, expect, it } from 'vitest';
import { formatAppointmentStatus } from './format';

describe('formatAppointmentStatus', () => {
  it('etiqueta el estado en sala', () => {
    expect(formatAppointmentStatus('in_room')).toBe('En sala');
  });

  it('mantiene las etiquetas existentes', () => {
    expect(formatAppointmentStatus('pending')).toBe('Pendiente');
    expect(formatAppointmentStatus('cancelled')).toBe('Cancelada');
  });
});
