import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { supabase } from '../lib/supabase';
import { findCall, mockQuery } from '../test/mockQuery';
import {
  createScheduleException,
  deleteScheduleException,
  getUpcomingBranchClosures,
  getUpcomingProfessionalExceptions,
  validateExceptionInput,
  type ScheduleExceptionInput,
} from './scheduleExceptionService';

vi.mock('../lib/supabase', () => ({
  supabase: { from: vi.fn() },
}));

// 2026-11-16 03:00 UTC = 2026-11-15 22:00 en Lima: "hoy" es el 15.
const NOW = new Date('2026-11-16T03:00:00Z');

const absence: ScheduleExceptionInput = {
  professionalId: 'p1',
  branchId: null,
  date: '2026-11-16',
  isAvailable: false,
  startTime: null,
  endTime: null,
  reason: 'Congreso',
};

describe('validateExceptionInput', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('acepta una ausencia de día completo', () => {
    expect(validateExceptionInput(absence)).toBeNull();
  });

  it('acepta hoy en hora de Lima aunque en UTC ya sea mañana', () => {
    expect(validateExceptionInput({ ...absence, date: '2026-11-15' })).toBeNull();
  });

  it('pide la fecha', () => {
    expect(validateExceptionInput({ ...absence, date: '' })).toBe('Elige una fecha.');
  });

  it('rechaza una fecha pasada', () => {
    expect(validateExceptionInput({ ...absence, date: '2026-11-14' })).toBe('La fecha ya pasó.');
  });

  it('exige las dos horas o ninguna', () => {
    expect(validateExceptionInput({ ...absence, startTime: '10:00' })).toBe('Completa la hora de inicio y de fin.');
  });

  it('exige que el fin sea posterior al inicio', () => {
    expect(validateExceptionInput({ ...absence, startTime: '11:00', endTime: '10:00' })).toBe(
      'La hora de fin debe ser posterior a la de inicio.',
    );
  });

  it('exige un rango para el turno extra', () => {
    expect(validateExceptionInput({ ...absence, isAvailable: true, branchId: 'b1' })).toBe(
      'Un turno extra necesita hora de inicio y fin.',
    );
  });

  it('exige la sede para el turno extra de una profesional', () => {
    expect(validateExceptionInput({ ...absence, isAvailable: true, startTime: '15:00', endTime: '17:00' })).toBe(
      'Elige la sede del turno extra.',
    );
  });

  it('acepta un turno extra con sede y rango', () => {
    expect(
      validateExceptionInput({ ...absence, isAvailable: true, branchId: 'b1', startTime: '15:00', endTime: '17:00' }),
    ).toBeNull();
  });
});

describe('scheduleExceptionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  const row = {
    id: 'e1',
    professional_id: 'p1',
    branch_id: null,
    exception_date: '2026-11-16',
    is_available: false,
    start_time: '10:00:00',
    end_time: '11:00:00',
    reason: 'Trámite',
  };

  it('getUpcomingProfessionalExceptions lee desde hoy en Lima y devuelve horas HH:MM', async () => {
    const query = mockQuery({ data: [row] });
    vi.mocked(supabase.from).mockReturnValue(query as never);

    const [exception] = await getUpcomingProfessionalExceptions('p1');

    expect(supabase.from).toHaveBeenCalledWith('schedule_exceptions');
    expect(findCall(query, 'eq')?.args).toEqual(['professional_id', 'p1']);
    expect(findCall(query, 'gte')?.args).toEqual(['exception_date', '2026-11-15']);
    expect(exception).toEqual({
      id: 'e1',
      professionalId: 'p1',
      branchId: null,
      date: '2026-11-16',
      isAvailable: false,
      startTime: '10:00',
      endTime: '11:00',
      reason: 'Trámite',
    });
  });

  it('getUpcomingBranchClosures solo trae cierres de la sede, sin profesional', async () => {
    const query = mockQuery({ data: [] });
    vi.mocked(supabase.from).mockReturnValue(query as never);

    await getUpcomingBranchClosures('b1');

    expect(findCall(query, 'eq')?.args).toEqual(['branch_id', 'b1']);
    expect(findCall(query, 'is')?.args).toEqual(['professional_id', null]);
    expect(findCall(query, 'gte')?.args).toEqual(['exception_date', '2026-11-15']);
  });

  it('createScheduleException no escribe si los datos son inválidos', async () => {
    await expect(createScheduleException({ ...absence, date: '2026-11-01' })).rejects.toThrow('La fecha ya pasó.');
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('createScheduleException no guarda un turno extra sin sede', async () => {
    await expect(
      createScheduleException({ ...absence, isAvailable: true, startTime: '15:00', endTime: '17:00' }),
    ).rejects.toThrow('Elige la sede del turno extra.');
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('createScheduleException guarda el turno extra con su sede', async () => {
    const query = mockQuery({});
    vi.mocked(supabase.from).mockReturnValue(query as never);

    await createScheduleException({ ...absence, isAvailable: true, branchId: 'b1', startTime: '15:00', endTime: '17:00' });

    expect(findCall(query, 'insert')?.args[0]).toMatchObject({ professional_id: 'p1', branch_id: 'b1', is_available: true });
  });

  it('createScheduleException inserta en el formato de la tabla', async () => {
    const query = mockQuery({});
    vi.mocked(supabase.from).mockReturnValue(query as never);

    await createScheduleException({ ...absence, startTime: '10:00', endTime: '11:00', reason: '  ' });

    expect(findCall(query, 'insert')?.args[0]).toEqual({
      professional_id: 'p1',
      branch_id: null,
      exception_date: '2026-11-16',
      is_available: false,
      start_time: '10:00',
      end_time: '11:00',
      reason: null,
    });
  });

  it('createScheduleException traduce el bloqueo de permisos', async () => {
    vi.mocked(supabase.from).mockReturnValue(
      mockQuery({ error: { message: 'new row violates row-level security policy for table "schedule_exceptions"' } }) as never,
    );

    await expect(createScheduleException(absence)).rejects.toThrow('No tienes permiso para modificar esta sede.');
  });

  it('deleteScheduleException avisa si los permisos no dejaron borrar nada', async () => {
    // Con RLS, un DELETE bloqueado no da error: simplemente no borra filas.
    vi.mocked(supabase.from).mockReturnValue(mockQuery({ data: [] }) as never);

    await expect(deleteScheduleException('e1')).rejects.toThrow('No tienes permiso para modificar esta sede.');
  });

  it('deleteScheduleException termina bien si borró la fila', async () => {
    const query = mockQuery({ data: [{ id: 'e1' }] });
    vi.mocked(supabase.from).mockReturnValue(query as never);

    await deleteScheduleException('e1');

    expect(findCall(query, 'eq')?.args).toEqual(['id', 'e1']);
    expect(findCall(query, 'select')).toBeDefined();
  });

  it('propaga el error de Supabase', async () => {
    vi.mocked(supabase.from).mockReturnValue(mockQuery({ error: { message: 'sin permiso' } }) as never);
    await expect(deleteScheduleException('e1')).rejects.toThrow('sin permiso');
  });
});
