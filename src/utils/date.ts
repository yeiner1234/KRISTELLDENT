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
