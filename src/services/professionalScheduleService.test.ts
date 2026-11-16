import { beforeEach, describe, expect, it, vi } from 'vitest';
import { supabase } from '../lib/supabase';
import { findCall, mockQuery, type MockQuery } from '../test/mockQuery';
import { getProfessionalWeeklySchedule, setProfessionalSchedule } from './professionalScheduleService';

vi.mock('../lib/supabase', () => ({
  supabase: { from: vi.fn() },
}));

const previousRows = [{ day_of_week: 1, start_time: '08:00:00', end_time: '12:00:00' }];

describe('setProfessionalSchedule', () => {
  let queries: MockQuery[];

  // Cada llamada a supabase.from devuelve una consulta nueva; las respuestas
  // salen en orden: lectura previa, borrado, inserción, (restauración).
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
    respondInOrder({ data: previousRows }, {}, {});

    await setProfessionalSchedule('p1', 'b1', [{ dayOfWeek: 1, startTime: '09:00', endTime: '13:00' }]);

    const [, deleteQuery, insertQuery] = queries;
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
    respondInOrder({ data: previousRows }, {}, { error: { message: 'insert falló' } }, {});

    await expect(
      setProfessionalSchedule('p1', 'b1', [{ dayOfWeek: 1, startTime: '09:00', endTime: '13:00' }]),
    ).rejects.toThrow('insert falló');

    expect(findCall(queries[3], 'insert')?.args[0]).toEqual([
      { professional_id: 'p1', branch_id: 'b1', day_of_week: 1, start_time: '08:00:00', end_time: '12:00:00' },
    ]);
  });

  it('no borra nada si no puede leer el horario actual', async () => {
    respondInOrder({ error: { message: 'sin permiso' } });

    await expect(setProfessionalSchedule('p1', 'b1', [])).rejects.toThrow('sin permiso');

    expect(queries).toHaveLength(1);
    expect(findCall(queries[0], 'delete')).toBeUndefined();
  });
});

describe('getProfessionalWeeklySchedule', () => {
  it('lee el horario de todas las sedes del profesional con horas HH:MM', async () => {
    const query = mockQuery({ data: [{ branch_id: 'b1', day_of_week: 1, start_time: '09:00:00', end_time: '13:00:00' }] });
    vi.mocked(supabase.from).mockReturnValue(query as never);

    const entries = await getProfessionalWeeklySchedule('p1');

    expect(query.calls.filter((call) => call.method === 'eq').map((call) => call.args)).toEqual([['professional_id', 'p1']]);
    expect(entries).toEqual([{ branchId: 'b1', dayOfWeek: 1, startTime: '09:00', endTime: '13:00' }]);
  });

  it('propaga el error de Supabase', async () => {
    vi.mocked(supabase.from).mockReturnValue(mockQuery({ error: { message: 'sin permiso' } }) as never);
    await expect(getProfessionalWeeklySchedule('p1')).rejects.toThrow('sin permiso');
  });
});
