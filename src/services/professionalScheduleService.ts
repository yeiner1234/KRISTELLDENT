import { supabase } from '../lib/supabase';
import { friendlyWriteError } from '../utils/supabaseErrors';
import { validateWeeklySchedule, validateWithinBranchHours } from '../utils/scheduleValidation';

interface BranchScheduleRow {
  day_of_week: number;
  open_time: string;
  close_time: string;
}

interface ProfessionalScheduleRow {
  day_of_week: number;
  start_time: string;
  end_time: string;
}

function toHHMM(time: string): string {
  return time.slice(0, 5);
}

export interface ProfessionalScheduleEntry {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

// Horario de un profesional en UNA sede puntual (un profesional puede tener
// sedes distintas con horarios distintos, por eso siempre se filtra por branchId).
export async function getProfessionalScheduleForAdmin(
  professionalId: string,
  branchId: string,
): Promise<ProfessionalScheduleEntry[]> {
  const { data, error } = await supabase
    .from('professional_schedules')
    .select('day_of_week, start_time, end_time')
    .eq('professional_id', professionalId)
    .eq('branch_id', branchId)
    .order('day_of_week', { ascending: true })
    .order('start_time', { ascending: true });

  if (error) {
    throw new Error(friendlyWriteError(error.message));
  }

  return ((data ?? []) as ProfessionalScheduleRow[]).map((row) => ({
    dayOfWeek: row.day_of_week,
    startTime: toHHMM(row.start_time),
    endTime: toHHMM(row.end_time),
  }));
}

// Reemplaza el horario del profesional en ESA sede (las demás sedes no se tocan).
// Supabase no da transacciones desde el cliente: se valida todo (rangos y
// horario de la sede) antes de borrar y, si el insert falla, se reinserta el
// horario anterior para no dejar a la profesional sin horario.
export async function setProfessionalSchedule(
  professionalId: string,
  branchId: string,
  entries: ProfessionalScheduleEntry[],
): Promise<void> {
  const validationError = validateWeeklySchedule(entries);
  if (validationError) {
    throw new Error(validationError);
  }

  if (entries.length > 0) {
    const { data: branchHours, error: branchError } = await supabase
      .from('branch_schedules')
      .select('day_of_week, open_time, close_time')
      .eq('branch_id', branchId);

    if (branchError) {
      throw new Error(friendlyWriteError(branchError.message));
    }

    const outsideError = validateWithinBranchHours(
      entries,
      ((branchHours ?? []) as BranchScheduleRow[]).map((row) => ({
        dayOfWeek: row.day_of_week,
        openTime: toHHMM(row.open_time),
        closeTime: toHHMM(row.close_time),
      })),
    );
    if (outsideError) {
      throw new Error(outsideError);
    }
  }

  const { data: previous, error: readError } = await supabase
    .from('professional_schedules')
    .select('day_of_week, start_time, end_time')
    .eq('professional_id', professionalId)
    .eq('branch_id', branchId);

  if (readError) {
    throw new Error(friendlyWriteError(readError.message));
  }

  const { error: deleteError } = await supabase
    .from('professional_schedules')
    .delete()
    .eq('professional_id', professionalId)
    .eq('branch_id', branchId);

  if (deleteError) {
    throw new Error(friendlyWriteError(deleteError.message));
  }

  if (entries.length === 0) {
    return;
  }

  const toRow = (row: ProfessionalScheduleRow) => ({
    professional_id: professionalId,
    branch_id: branchId,
    ...row,
  });

  const { error: insertError } = await supabase.from('professional_schedules').insert(
    entries.map((entry) =>
      toRow({ day_of_week: entry.dayOfWeek, start_time: entry.startTime, end_time: entry.endTime }),
    ),
  );

  if (insertError) {
    const previousRows = (previous ?? []) as ProfessionalScheduleRow[];
    if (previousRows.length > 0) {
      await supabase.from('professional_schedules').insert(previousRows.map(toRow));
    }
    throw new Error(friendlyWriteError(insertError.message));
  }
}
