import { beforeEach, describe, expect, it, vi } from 'vitest';
import { supabase } from '../lib/supabase';
import { findCall, mockQuery, type MockQuery } from '../test/mockQuery';
import { setProfessionalSchedule } from './professionalScheduleService';

vi.mock('../lib/supabase', () => ({
  supabase: { from: vi.fn() },
}));

const branchHours = [{ day_of_week: 1, open_time: '08:00:00', close_time: '14:00:00' }];
const previousRows = [{ day_of_week: 1, start_time: '08:00:00', end_time: '12:00:00' }];

describe('setProfessionalSchedule', () => {
  let queries: MockQuery[];

  // Cada llamada a supabase.from devuelve una consulta nueva; las respuestas
  // salen en orden: horario de la sede y horarios en otras sedes (si hay
  // rangos), lectura previa, borrado, inserción, (restauración).
  const respondInOrder = (...results: Parameters<typeof mockQuery>[0][]) => {
    queries = [];
    vi.mocked(supabase.from).mockImplementation(() => {
      const query = mockQuery(results[queries.length] ?? {});
      queries.push(query);
      return query as never;
    });
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('no toca la base si los rangos son inválidos', async () => {
    respondInOrder();

    await expect(
      setProfessionalSchedule('p1', 'b1', [
        { dayOfWeek: 1, startTime: '09:00', endTime: '13:00' },
        { dayOfWeek: 1, startTime: '12:00', endTime: '14:00' },
      ]),
    ).rejects.toThrow('Lunes: Los rangos se cruzan.');

    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('borra el horario de esa sede e inserta el nuevo', async () => {
    respondInOrder({ data: branchHours }, { data: [] }, { data: previousRows }, {}, {});

    await setProfessionalSchedule('p1', 'b1', [{ dayOfWeek: 1, startTime: '09:00', endTime: '13:00' }]);

    const [, , , deleteQuery, insertQuery] = queries;
    expect(findCall(deleteQuery, 'delete')).toBeDefined();
    expect(deleteQuery.calls.filter((call) => call.method === 'eq').map((call) => call.args)).toEqual([
      ['professional_id', 'p1'],
      ['branch_id', 'b1'],
    ]);
    expect(findCall(insertQuery, 'insert')?.args[0]).toEqual([
      { professional_id: 'p1', branch_id: 'b1', day_of_week: 1, start_time: '09:00', end_time: '13:00' },
    ]);
  });

  it('restaura el horario anterior si el insert falla', async () => {
    respondInOrder({ data: branchHours }, { data: [] }, { data: previousRows }, {}, { error: { message: 'insert falló' } }, {});

    await expect(
      setProfessionalSchedule('p1', 'b1', [{ dayOfWeek: 1, startTime: '09:00', endTime: '13:00' }]),
    ).rejects.toThrow('insert falló');

    expect(findCall(queries[5], 'insert')?.args[0]).toEqual([
      { professional_id: 'p1', branch_id: 'b1', day_of_week: 1, start_time: '08:00:00', end_time: '12:00:00' },
    ]);
  });

  it('no borra nada si un rango queda fuera del horario de la sede', async () => {
    respondInOrder({ data: branchHours });

    await expect(
      setProfessionalSchedule('p1', 'b1', [{ dayOfWeek: 1, startTime: '07:00', endTime: '12:00' }]),
    ).rejects.toThrow('Lunes: El horario del profesional debe estar dentro del horario de la sede.');

    expect(vi.mocked(supabase.from).mock.calls.map(([table]) => table)).toEqual(['branch_schedules']);
    expect(findCall(queries[0], 'eq')?.args).toEqual(['branch_id', 'b1']);
  });

  it('no borra nada si el horario se cruza con el de otra sede', async () => {
    respondInOrder(
      { data: branchHours },
      { data: [{ day_of_week: 1, start_time: '09:00:00', end_time: '13:00:00', branches: { name: 'Bagua' } }] },
    );

    await expect(
      setProfessionalSchedule('p1', 'b1', [{ dayOfWeek: 1, startTime: '12:00', endTime: '14:00' }]),
    ).rejects.toThrow('Ese horario se cruza con su horario en Bagua (lunes 09:00–13:00).');

    expect(queries).toHaveLength(2);
    expect(queries[1].calls.filter((call) => call.method === 'eq' || call.method === 'neq').map((call) => call.args)).toEqual([
      ['professional_id', 'p1'],
      ['branch_id', 'b1'],
    ]);
    expect(findCall(queries[1], 'neq')?.args).toEqual(['branch_id', 'b1']);
  });

  it('traduce el bloqueo de permisos al guardar', async () => {
    respondInOrder({ data: [] }, { error: { message: 'new row violates row-level security policy for table "professional_schedules"' } });

    await expect(setProfessionalSchedule('p1', 'b1', [])).rejects.toThrow('No tienes permiso para modificar esta sede.');
  });

  it('no borra nada si no puede leer el horario actual', async () => {
    respondInOrder({ error: { message: 'sin permiso' } });

    await expect(setProfessionalSchedule('p1', 'b1', [])).rejects.toThrow('sin permiso');

    expect(queries).toHaveLength(1);
    expect(findCall(queries[0], 'delete')).toBeUndefined();
  });
});
