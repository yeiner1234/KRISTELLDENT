import { beforeEach, describe, expect, it, vi } from 'vitest';
import { supabase } from '../lib/supabase';
import { findCall, mockQuery } from '../test/mockQuery';
import { createSpecialty, deleteSpecialty, updateSpecialty } from './specialtyService';

vi.mock('../lib/supabase', () => ({
  supabase: { from: vi.fn() },
}));

const row = { id: 'rehab', name: 'Rehabilitación oral', description: null, active: true };

describe('specialtyService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('agrega una especialidad con el nombre sin espacios de más', async () => {
    const query = mockQuery({ data: row });
    vi.mocked(supabase.from).mockReturnValue(query as never);

    const specialty = await createSpecialty({ name: '  Rehabilitación   oral ', description: '' });

    expect(findCall(query, 'insert')?.args[0]).toEqual({ name: 'Rehabilitación oral', description: null });
    expect(specialty).toEqual(row);
  });

  it('sin nombre no escribe nada', async () => {
    await expect(createSpecialty({ name: '  ', description: null })).rejects.toThrow('Escribe el nombre de la especialidad.');
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('la especialidad repetida llega con el mensaje de la base', async () => {
    vi.mocked(supabase.from).mockReturnValue(
      mockQuery({ error: { message: 'Ya existe esa especialidad: elígela de la lista.', code: '23505' } }) as never,
    );

    await expect(createSpecialty({ name: 'rehabilitacion oral', description: null })).rejects.toThrow(
      'Ya existe esa especialidad: elígela de la lista.',
    );
  });

  it('renombrar sin permiso (admin_sede) da un mensaje claro', async () => {
    vi.mocked(supabase.from).mockReturnValue(mockQuery({ error: { message: 'permission denied for table specialties' } }) as never);

    await expect(updateSpecialty('rehab', { name: 'X', description: null })).rejects.toThrow(
      'No tienes permiso para modificar esta sede.',
    );
  });

  it('borrar una especialidad en uso explica que se desactive', async () => {
    vi.mocked(supabase.from).mockReturnValue(
      mockQuery({
        error: {
          message:
            'update or delete on table "specialties" violates foreign key constraint "services_specialty_id_fkey" on table "services"',
        },
      }) as never,
    );

    await expect(deleteSpecialty('rehab')).rejects.toThrow('No se puede borrar: hay servicios o profesionales con esta especialidad.');
  });

  it('un borrado que la RLS ignora (0 filas) no pasa en silencio', async () => {
    vi.mocked(supabase.from).mockReturnValue(mockQuery({ data: [] }) as never);

    await expect(deleteSpecialty('rehab')).rejects.toThrow('No se pudo borrar la especialidad.');
  });
});
