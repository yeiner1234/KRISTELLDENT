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

  it('traduce la sede sin región', () => {
    expect(
      friendlyWriteError('new row for relation "branches" violates check constraint "branches_region_required"'),
    ).toBe('La sede no tiene región: edítala y agrégala antes de cambiarla.');
  });

  it('traduce los nombres repetidos (índices únicos por nombre)', () => {
    expect(
      friendlyWriteError('duplicate key value violates unique constraint "specialties_name_key_unique"'),
    ).toBe('Ya existe esa especialidad: elígela de la lista.');
    expect(
      friendlyWriteError('duplicate key value violates unique constraint "services_branch_name_key_unique"'),
    ).toBe('Esta sede ya tiene un servicio con ese nombre.');
  });

  it('traduce la duración máxima de un servicio', () => {
    expect(
      friendlyWriteError('new row for relation "services" violates check constraint "services_duration_max"'),
    ).toBe('La duración no puede pasar de 480 minutos.');
  });

  it('explica por qué no se borra una especialidad o un servicio en uso', () => {
    expect(
      friendlyWriteError(
        'update or delete on table "specialties" violates foreign key constraint "services_specialty_id_fkey" on table "services"',
      ),
    ).toBe('No se puede borrar: hay servicios o profesionales con esta especialidad. Desactívala en su lugar.');
    expect(
      friendlyWriteError(
        'update or delete on table "services" violates foreign key constraint "appointments_service_id_fkey" on table "appointments"',
      ),
    ).toBe('No se puede borrar: hay citas con este servicio. Desactívalo en su lugar.');
  });

  it('deja pasar los demás mensajes tal cual', () => {
    expect(friendlyWriteError('Failed to fetch')).toBe('Failed to fetch');
  });
});
