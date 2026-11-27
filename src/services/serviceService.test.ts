import { beforeEach, describe, expect, it, vi } from 'vitest';
import { supabase } from '../lib/supabase';
import { findCall, mockQuery } from '../test/mockQuery';
import {
  createService,
  deleteService,
  updateService,
  validateServiceInput,
} from './serviceService';

vi.mock('../lib/supabase', () => ({
  supabase: { from: vi.fn() },
}));

const row = {
  id: 's1',
  name: 'Control de ortodoncia',
  specialty_id: 'orto',
  branch_id: 'jaen',
  duration_minutes: 30,
  price: '80.00',
  active: true,
  sessions: 4,
};

const input = { name: '  Control de ortodoncia ', specialtyId: 'orto', duration: 30, price: 80, sessions: 4 };

describe('validateServiceInput', () => {
  it('acepta un servicio completo', () => {
    expect(validateServiceInput(input)).toBeNull();
  });

  it('pide nombre, especialidad, duración entre 1 y 480 y precio no negativo', () => {
    expect(validateServiceInput({ ...input, name: '  ' })).toBe('Escribe el nombre del servicio.');
    expect(validateServiceInput({ ...input, specialtyId: '' })).toBe('Elige una especialidad.');
    expect(validateServiceInput({ ...input, duration: 0 })).toBe('La duración debe estar entre 1 y 480 minutos.');
    expect(validateServiceInput({ ...input, duration: 481 })).toBe('La duración debe estar entre 1 y 480 minutos.');
    expect(validateServiceInput({ ...input, duration: 12.5 })).toBe('La duración debe estar entre 1 y 480 minutos.');
    expect(validateServiceInput({ ...input, price: -1 })).toBe('El precio no puede ser negativo.');
  });

  it('las sesiones van de 1 a 60 y son enteras; sin sesiones, vale 1', () => {
    expect(validateServiceInput({ ...input, sessions: 0 })).toBe('Las sesiones deben estar entre 1 y 60.');
    expect(validateServiceInput({ ...input, sessions: 61 })).toBe('Las sesiones deben estar entre 1 y 60.');
    expect(validateServiceInput({ ...input, sessions: 1.5 })).toBe('Las sesiones deben estar entre 1 y 60.');
    expect(validateServiceInput({ ...input, sessions: undefined })).toBeNull();
  });
});

describe('serviceService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('crea el servicio en la sede indicada, con el nombre sin espacios de más', async () => {
    const query = mockQuery({ data: row });
    vi.mocked(supabase.from).mockReturnValue(query as never);

    const service = await createService({ ...input, branchId: 'jaen' });

    expect(findCall(query, 'insert')?.args[0]).toEqual({
      branch_id: 'jaen',
      name: 'Control de ortodoncia',
      specialty_id: 'orto',
      duration_minutes: 30,
      price: 80,
      sessions: 4,
    });
    expect(service).toEqual({
      id: 's1',
      name: 'Control de ortodoncia',
      specialtyId: 'orto',
      branchId: 'jaen',
      duration: 30,
      price: 80,
      active: true,
      sessions: 4,
    });
  });

  it('no escribe nada si los datos no son válidos', async () => {
    await expect(createService({ ...input, branchId: 'jaen', duration: 600 })).rejects.toThrow(
      'La duración debe estar entre 1 y 480 minutos.',
    );
    await expect(createService({ ...input, branchId: '' })).rejects.toThrow('Elige una sede.');
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('el mensaje del trigger de nombre repetido llega tal cual', async () => {
    vi.mocked(supabase.from).mockReturnValue(
      mockQuery({ error: { message: 'Esta sede ya tiene un servicio con ese nombre.' } }) as never,
    );

    await expect(createService({ ...input, branchId: 'jaen' })).rejects.toThrow(
      'Esta sede ya tiene un servicio con ese nombre.',
    );
  });

  it('editar no cambia la sede', async () => {
    const query = mockQuery({ data: row });
    vi.mocked(supabase.from).mockReturnValue(query as never);

    await updateService('s1', input);

    expect(findCall(query, 'update')?.args[0]).not.toHaveProperty('branch_id');
  });

  it('un servicio sin columna de sesiones (datos viejos) cuenta como de una sesión', async () => {
    const { sessions: _omit, ...oldRow } = row;
    vi.mocked(supabase.from).mockReturnValue(mockQuery({ data: oldRow }) as never);

    const service = await updateService('s1', input);

    expect(service.sessions).toBe(1);
  });

  it('RLS de otra sede se traduce a un mensaje claro', async () => {
    vi.mocked(supabase.from).mockReturnValue(
      mockQuery({ error: { message: 'new row violates row-level security policy for table "services"' } }) as never,
    );

    await expect(updateService('s1', input)).rejects.toThrow('No tienes permiso para modificar esta sede.');
  });

  it('borrar un servicio con citas explica que se desactive', async () => {
    vi.mocked(supabase.from).mockReturnValue(
      mockQuery({
        error: {
          message:
            'update or delete on table "services" violates foreign key constraint "appointments_service_id_fkey" on table "appointments"',
        },
      }) as never,
    );

    await expect(deleteService('s1')).rejects.toThrow('No se puede borrar: hay citas con este servicio.');
  });
});
