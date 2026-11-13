import { supabase } from '../lib/supabase';

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
    throw new Error(error.message);
  }

  return ((data ?? []) as ProfessionalScheduleRow[]).map((row) => ({
    dayOfWeek: row.day_of_week,
    startTime: toHHMM(row.start_time),
    endTime: toHHMM(row.end_time),
  }));
}

// Reemplaza el horario del profesional en ESA sede (las demás sedes no se tocan).
export async function setProfessionalSchedule(
  professionalId: string,
  branchId: string,
  entries: ProfessionalScheduleEntry[],
): Promise<void> {
  const { error: deleteError } = await supabase
    .from('professional_schedules')
    .delete()
    .eq('professional_id', professionalId)
    .eq('branch_id', branchId);

  if (deleteError) {
    throw new Error(deleteError.message);
  }

  if (entries.length === 0) {
    return;
  }

  const { error: insertError } = await supabase.from('professional_schedules').insert(
    entries.map((entry) => ({
      professional_id: professionalId,
      branch_id: branchId,
      day_of_week: entry.dayOfWeek,
      start_time: entry.startTime,
      end_time: entry.endTime,
    })),
  );

  if (insertError) {
    throw new Error(insertError.message);
  }
}
