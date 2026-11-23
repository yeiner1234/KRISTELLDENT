// Reglas de los horarios semanales que carga el admin. Se validan en el
// navegador antes de escribir: setProfessionalSchedule borra y vuelve a
// insertar, así que un dato malo no debe llegar nunca al borrado.

export const DAY_LABELS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export interface TimeRange {
  start: string;
  end: string;
}

interface WeeklyEntry {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

interface BranchDayHours {
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
}

// Las horas llegan como HH:MM (o HH:MM:SS): la comparación de texto basta.
export function validateDayRanges(ranges: TimeRange[]): string | null {
  for (const range of ranges) {
    if (!range.start || !range.end) {
      return 'Completa la hora de inicio y de fin.';
    }
    if (range.end <= range.start) {
      return 'La hora de fin debe ser posterior a la de inicio.';
    }
  }

  const sorted = [...ranges].sort((a, b) => a.start.localeCompare(b.start));
  for (let i = 1; i < sorted.length; i++) {
    // Tocarse (13:00–13:00) no es cruce.
    if (sorted[i].start < sorted[i - 1].end) {
      return 'Los rangos se cruzan.';
    }
  }

  return null;
}

export function validateWeeklySchedule(entries: WeeklyEntry[]): string | null {
  for (let day = 0; day < 7; day++) {
    const ranges = entries
      .filter((entry) => entry.dayOfWeek === day)
      .map((entry) => ({ start: entry.startTime, end: entry.endTime }));
    const error = validateDayRanges(ranges);
    if (error) {
      return `${DAY_LABELS[day]}: ${error}`;
    }
  }
  return null;
}

// Días con algún rango fuera del horario de la sede (o con la sede cerrada).
// Marca en el modal los días que impiden guardar.
export function rangesOutsideBranchHours(entries: WeeklyEntry[], branchSchedule: BranchDayHours[]): number[] {
  const days = new Set<number>();
  for (const entry of entries) {
    const branchDay = branchSchedule.find((day) => day.dayOfWeek === entry.dayOfWeek);
    if (!branchDay || entry.startTime < branchDay.openTime || entry.endTime > branchDay.closeTime) {
      days.add(entry.dayOfWeek);
    }
  }
  return [...days].sort((a, b) => a - b);
}

// Criterio 2 de la HU de horarios: el horario del profesional cabe dentro del
// de la sede ese día. La base lo exige también (trigger
// enforce_schedule_within_branch_hours).
export function validateWithinBranchHours(entries: WeeklyEntry[], branchSchedule: BranchDayHours[]): string | null {
  const [firstDay] = rangesOutsideBranchHours(entries, branchSchedule);
  if (firstDay === undefined) {
    return null;
  }
  return `${DAY_LABELS[firstDay]}: El horario del profesional debe estar dentro del horario de la sede.`;
}

export interface OtherBranchRange extends WeeklyEntry {
  branchName: string;
}

// Caso límite 2: la misma profesional no puede estar en dos sedes a la vez.
// La base lo exige con professional_schedules_no_overlap; aquí se arma un
// mensaje que dice con qué sede y rango choca.
export function findCrossBranchOverlap(entries: WeeklyEntry[], otherBranches: OtherBranchRange[]): string | null {
  for (const entry of entries) {
    const clash = otherBranches.find(
      (other) =>
        other.dayOfWeek === entry.dayOfWeek && entry.startTime < other.endTime && other.startTime < entry.endTime,
    );
    if (clash) {
      const day = DAY_LABELS[clash.dayOfWeek].toLowerCase();
      return `Ese horario se cruza con su horario en ${clash.branchName} (${day} ${clash.startTime}–${clash.endTime}).`;
    }
  }
  return null;
}
