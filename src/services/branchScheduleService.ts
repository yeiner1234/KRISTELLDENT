import { supabase } from '../lib/supabase';
import type { WeekdayKey, WeeklyHours } from '../utils/businessHours';

const WEEKDAY_KEYS: WeekdayKey[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

interface BranchScheduleRow {
  day_of_week: number;
  open_time: string;
  close_time: string;
}

function toHHMM(time: string): string {
  return time.slice(0, 5);
}

// Para el badge público "Abierta/Cerrada": convierte las filas de Supabase
// al mismo WeeklyHours que ya consumía utils/businessHours.ts sin cambiar
// esa lógica pura.
export async function getBranchWeeklyHours(branchId: string): Promise<WeeklyHours> {
  const { data, error } = await supabase
    .from('branch_schedules')
    .select('day_of_week, open_time, close_time')
    .eq('branch_id', branchId);

  if (error) {
    throw new Error(error.message);
  }

  const hours: WeeklyHours = {};

  for (const row of (data ?? []) as BranchScheduleRow[]) {
    const key = WEEKDAY_KEYS[row.day_of_week];
    if (key) {
      hours[key] = { open: toHHMM(row.open_time), close: toHHMM(row.close_time) };
    }
  }

  return hours;
}

export interface BranchScheduleEntry {
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
}

export async function getBranchScheduleForAdmin(branchId: string): Promise<BranchScheduleEntry[]> {
  const { data, error } = await supabase
    .from('branch_schedules')
    .select('day_of_week, open_time, close_time')
    .eq('branch_id', branchId)
    .order('day_of_week', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as BranchScheduleRow[]).map((row) => ({
    dayOfWeek: row.day_of_week,
    openTime: toHHMM(row.open_time),
    closeTime: toHHMM(row.close_time),
  }));
}

// Reemplaza todo el horario semanal de la sede: los días que no vienen en
// `entries` quedan como "cerrado" (sin fila), igual que branch.hours antes.
export async function setBranchSchedule(branchId: string, entries: BranchScheduleEntry[]): Promise<void> {
  const { error: deleteError } = await supabase.from('branch_schedules').delete().eq('branch_id', branchId);

  if (deleteError) {
    throw new Error(deleteError.message);
  }

  if (entries.length === 0) {
    return;
  }

  const { error: insertError } = await supabase.from('branch_schedules').insert(
    entries.map((entry) => ({
      branch_id: branchId,
      day_of_week: entry.dayOfWeek,
      open_time: entry.openTime,
      close_time: entry.closeTime,
    })),
  );

  if (insertError) {
    throw new Error(insertError.message);
  }
}
