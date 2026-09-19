export type WeekdayKey = 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat';

export interface DayHours {
  open: string;
  close: string;
}

export type WeeklyHours = Partial<Record<WeekdayKey, DayHours>>;

const WEEKDAY_KEYS: WeekdayKey[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

const WEEKDAY_LABELS: Record<WeekdayKey, string> = {
  sun: 'Domingo',
  mon: 'Lunes',
  tue: 'Martes',
  wed: 'Miércoles',
  thu: 'Jueves',
  fri: 'Viernes',
  sat: 'Sábado',
};

// All branches operate on Peru local time regardless of the visitor's own
// timezone/device clock, so "open now" is computed against America/Lima.
function getPeruNow(): Date {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });

  const parts = formatter.formatToParts(new Date());
  const map: Record<string, string> = {};
  for (const part of parts) {
    map[part.type] = part.value;
  }

  return new Date(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    Number(map.hour),
    Number(map.minute),
    Number(map.second),
  );
}

function toMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

export interface BranchOpenStatus {
  isOpen: boolean;
  todayLabel: string;
}

export function getBranchOpenStatus(hours: WeeklyHours): BranchOpenStatus {
  const now = getPeruNow();
  const weekday = WEEKDAY_KEYS[now.getDay()];
  const today = hours[weekday];

  if (!today) {
    return { isOpen: false, todayLabel: `${WEEKDAY_LABELS[weekday]}: cerrado` };
  }

  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const isOpen = nowMinutes >= toMinutes(today.open) && nowMinutes < toMinutes(today.close);

  return { isOpen, todayLabel: `Hoy ${today.open} – ${today.close}` };
}
