import { supabase } from '../lib/supabase';
import { getTodayIsoDate } from '../utils/date';
import { validateDayRanges } from '../utils/scheduleValidation';

// Excepciones a un horario recurrente: ausencias y turnos extra de un
// profesional, o feriados y cierres de una sede. Solo las lee el admin: el
// público ve el efecto a través de get_available_slots, nunca los motivos.

export interface ScheduleException {
  id: string;
  professionalId: string | null;
  branchId: string | null;
  date: string;
  // true = turno extra; false = no disponible.
  isAvailable: boolean;
  // null en ambas = día completo.
  startTime: string | null;
  endTime: string | null;
  reason: string | null;
}

export type ScheduleExceptionInput = Omit<ScheduleException, 'id'>;

interface ScheduleExceptionRow {
  id: string;
  professional_id: string | null;
  branch_id: string | null;
  exception_date: string;
  is_available: boolean;
  start_time: string | null;
  end_time: string | null;
  reason: string | null;
}

const COLUMNS = 'id, professional_id, branch_id, exception_date, is_available, start_time, end_time, reason';

function toException(row: ScheduleExceptionRow): ScheduleException {
  return {
    id: row.id,
    professionalId: row.professional_id,
    branchId: row.branch_id,
    date: row.exception_date,
    isAvailable: row.is_available,
    startTime: row.start_time ? row.start_time.slice(0, 5) : null,
    endTime: row.end_time ? row.end_time.slice(0, 5) : null,
    reason: row.reason,
  };
}

export function validateExceptionInput(input: ScheduleExceptionInput): string | null {
  if (!input.date) {
    return 'Elige una fecha.';
  }
  if (input.date < getTodayIsoDate()) {
    return 'La fecha ya pasó.';
  }
  if (input.startTime === null && input.endTime === null) {
    return input.isAvailable ? 'Un turno extra necesita hora de inicio y fin.' : null;
  }
  return validateDayRanges([{ start: input.startTime ?? '', end: input.endTime ?? '' }]);
}

export async function getUpcomingProfessionalExceptions(professionalId: string): Promise<ScheduleException[]> {
  const { data, error } = await supabase
    .from('schedule_exceptions')
    .select(COLUMNS)
    .eq('professional_id', professionalId)
    .gte('exception_date', getTodayIsoDate())
    .order('exception_date', { ascending: true })
    .order('start_time', { ascending: true, nullsFirst: true });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as ScheduleExceptionRow[]).map(toException);
}

export async function getUpcomingBranchClosures(branchId: string): Promise<ScheduleException[]> {
  const { data, error } = await supabase
    .from('schedule_exceptions')
    .select(COLUMNS)
    .eq('branch_id', branchId)
    .is('professional_id', null)
    .gte('exception_date', getTodayIsoDate())
    .order('exception_date', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as ScheduleExceptionRow[]).map(toException);
}

export async function createScheduleException(input: ScheduleExceptionInput): Promise<void> {
  const validationError = validateExceptionInput(input);
  if (validationError) {
    throw new Error(validationError);
  }

  const { error } = await supabase.from('schedule_exceptions').insert({
    professional_id: input.professionalId,
    branch_id: input.branchId,
    exception_date: input.date,
    is_available: input.isAvailable,
    start_time: input.startTime,
    end_time: input.endTime,
    reason: input.reason?.trim() ? input.reason.trim() : null,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteScheduleException(id: string): Promise<void> {
  const { error } = await supabase.from('schedule_exceptions').delete().eq('id', id);

  if (error) {
    throw new Error(error.message);
  }
}
