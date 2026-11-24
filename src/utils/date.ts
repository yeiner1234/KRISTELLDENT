// El negocio opera en hora de Lima: "hoy" no puede salir de la fecha UTC, que
// a partir de las 19:00 de Lima ya es el día siguiente.
const limaDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Lima',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export function getTodayIsoDate(): string {
  return limaDateFormatter.format(new Date());
}

// h23: algunos motores dan "24:05" a medianoche con hour12: false.
const limaTimeFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'America/Lima',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

// Hora actual de Lima en HH:MM.
export function getLimaNowTime(): string {
  return limaTimeFormatter.format(new Date());
}

export function formatDateLong(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00`);
  return date.toLocaleDateString('es-PE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function formatTimeRange(startTime: string, endTime: string): string {
  return `${startTime} - ${endTime}`;
}

export function addMinutesToTime(time: string, minutes: number): string {
  const [hours, mins] = time.split(':').map(Number);
  const totalMinutes = hours * 60 + mins + minutes;
  const newHours = Math.floor(totalMinutes / 60) % 24;
  const newMins = totalMinutes % 60;
  return `${String(newHours).padStart(2, '0')}:${String(newMins).padStart(2, '0')}`;
}

// Aritmética de fechas sobre cadenas AAAA-MM-DD en UTC: el resultado no
// depende de la zona horaria del navegador.
function parseIsoDateUtc(isoDate: string): Date {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function addDaysToIsoDate(isoDate: string, days: number): string {
  const date = parseIsoDateUtc(isoDate);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

// Lunes de la semana que muestra la agenda (lunes a sábado). La semana se
// cuenta desde el domingo: un domingo abre en la semana que empieza mañana.
export function getAgendaWeekStart(todayIso: string): string {
  const dayOfWeek = parseIsoDateUtc(todayIso).getUTCDay();
  return addDaysToIsoDate(todayIso, dayOfWeek === 0 ? 1 : 1 - dayOfWeek);
}

// Agenda en celular (un día a la vez, de lunes a sábado): mueve el día
// elegido y cambia de semana al pasar del sábado o antes del lunes.
export function shiftAgendaDay(
  weekStart: string,
  dayIndex: number,
  delta: 1 | -1,
): { weekStart: string; dayIndex: number } {
  const next = dayIndex + delta;
  if (next > 5) {
    return { weekStart: addDaysToIsoDate(weekStart, 7), dayIndex: 0 };
  }
  if (next < 0) {
    return { weekStart: addDaysToIsoDate(weekStart, -7), dayIndex: 5 };
  }
  return { weekStart, dayIndex: next };
}
