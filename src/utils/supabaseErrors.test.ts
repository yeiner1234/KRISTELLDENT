import { describe, expect, it } from 'vitest';
import { friendlyWriteError } from './supabaseErrors';

describe('friendlyWriteError', () => {
  it('traduce el bloqueo de RLS a un mensaje claro', () => {
    expect(friendlyWriteError('new row violates row-level security policy for table "professional_schedules"')).toBe(
      'No tienes permiso para modificar esta sede.',
    );
  });

  it('traduce también el permission denied de Postgres (42501)', () => {
    expect(friendlyWriteError('permission denied for table schedule_exceptions')).toBe(
      'No tienes permiso para modificar esta sede.',
    );
  });

  it('traduce el cruce de horarios entre sedes', () => {
    expect(
      friendlyWriteError('conflicting key value violates exclusion constraint "professional_schedules_no_overlap"'),
    ).toBe('Ese horario se cruza con su horario en otra sede.');
  });

  it('deja pasar los demás mensajes tal cual', () => {
    expect(friendlyWriteError('Failed to fetch')).toBe('Failed to fetch');
  });
});
