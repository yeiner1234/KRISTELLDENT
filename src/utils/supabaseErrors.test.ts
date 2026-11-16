import { describe, expect, it } from 'vitest';
import { friendlyWriteError } from './supabaseErrors';

describe('friendlyWriteError', () => {
  it('traduce el bloqueo de RLS a un mensaje claro', () => {
    expect(friendlyWriteError('new row violates row-level security policy for table "professional_schedules"')).toBe(
      'No tienes permiso para modificar esta sede.',
    );
  });

  it('deja pasar los demás mensajes tal cual', () => {
    expect(friendlyWriteError('Failed to fetch')).toBe('Failed to fetch');
  });
});
