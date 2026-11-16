// Qué pintar en la agenda para un profesional en un día: sus horas de
// trabajo, las ausencias que las tapan y los turnos extra. Sigue las mismas
// reglas que get_available_slots, pero sin restar citas (esas ya se dibujan).

export type AvailabilityKind = 'work' | 'absence' | 'extra';

export interface AvailabilityBlock {
  start: string;
  end: string;
  kind: AvailabilityKind;
}

interface WeeklyEntry {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

interface DayException {
  date: string;
  isAvailable: boolean;
  startTime: string | null;
  endTime: string | null;
}

function toMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function toTime(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

export function availabilityForDay(isoDate: string, weekly: WeeklyEntry[], exceptions: DayException[]): AvailabilityBlock[] {
  const dayOfWeek = new Date(`${isoDate}T00:00:00Z`).getUTCDay();
  const work = weekly
    .filter((entry) => entry.dayOfWeek === dayOfWeek)
    .map((entry) => ({ start: toMinutes(entry.startTime), end: toMinutes(entry.endTime) }));
  const dayExceptions = exceptions.filter((item) => item.date === isoDate);

  const isFullDayAbsence = dayExceptions.some((item) => !item.isAvailable && item.startTime === null);
  const absences = dayExceptions
    .filter((item) => !item.isAvailable && item.startTime !== null && item.endTime !== null)
    .map((item) => ({ start: toMinutes(item.startTime as string), end: toMinutes(item.endTime as string) }))
    .sort((a, b) => a.start - b.start);

  const blocks: { start: number; end: number; kind: AvailabilityKind }[] = [];

  for (const range of work) {
    if (isFullDayAbsence) {
      blocks.push({ ...range, kind: 'absence' });
      continue;
    }
    // Recorre el bloque de trabajo cortándolo donde lo tapa una ausencia.
    let cursor = range.start;
    for (const absence of absences) {
      const from = Math.max(absence.start, range.start);
      const to = Math.min(absence.end, range.end);
      if (from >= to) continue;
      if (from > cursor) blocks.push({ start: cursor, end: from, kind: 'work' });
      blocks.push({ start: from, end: to, kind: 'absence' });
      cursor = Math.max(cursor, to);
    }
    if (cursor < range.end) blocks.push({ start: cursor, end: range.end, kind: 'work' });
  }

  for (const item of dayExceptions) {
    if (item.isAvailable && item.startTime && item.endTime) {
      blocks.push({ start: toMinutes(item.startTime), end: toMinutes(item.endTime), kind: 'extra' });
    }
  }

  return blocks
    .sort((a, b) => a.start - b.start)
    .map((block) => ({ start: toTime(block.start), end: toTime(block.end), kind: block.kind }));
}

// Parte de un bloque que cae dentro de la fila de una hora de la agenda, en
// porcentaje de la altura de esa fila.
export function segmentInHour(
  block: { start: string; end: string },
  hour: number,
): { topPct: number; heightPct: number } | null {
  const from = Math.max(toMinutes(block.start), hour * 60);
  const to = Math.min(toMinutes(block.end), (hour + 1) * 60);
  if (from >= to) return null;
  return { topPct: ((from - hour * 60) / 60) * 100, heightPct: ((to - from) / 60) * 100 };
}
