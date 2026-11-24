import { useMemo, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Appointment } from '../../types/Appointment';
import { addDaysToIsoDate, getAgendaWeekStart, getTodayIsoDate, shiftAgendaDay } from '../../utils/date';

interface AgendaGridProps {
  appointments: Appointment[];
  resolveTitle?: (appointment: Appointment) => string;
  resolveSubtitle?: (appointment: Appointment) => string;
  headerRight?: ReactNode;
  onSelect?: (appointment: Appointment) => void;
}

const dayLabels = ['L', 'M', 'X', 'J', 'V', 'S'];
const dayNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const HOUR_START = 8;
const HOUR_END = 19;

const statusStyles: Record<Appointment['status'], { bg: string; text: string; solid: string }> = {
  confirmed: { bg: 'bg-adm-status-confirmed-bg', text: 'text-adm-status-confirmed-text', solid: 'border-adm-status-confirmed-solid' },
  pending: { bg: 'bg-adm-status-pending-bg', text: 'text-adm-status-pending-text', solid: 'border-adm-status-pending-solid' },
  in_room: { bg: 'bg-adm-status-in-room-bg', text: 'text-adm-status-in-room-text', solid: 'border-adm-status-in-room-solid' },
  cancelled: { bg: 'bg-adm-status-cancelled-bg', text: 'text-adm-status-cancelled-text', solid: 'border-adm-status-cancelled-solid' },
  completed: { bg: 'bg-adm-status-completed-bg', text: 'text-adm-status-completed-text', solid: 'border-adm-status-completed-solid' },
};

function toLocalDate(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00`);
}

// Desde md: la semana completa. En celular: un día a la vez, con flechas y
// selector L M X J V S; las demás columnas se ocultan con CSS.
function AgendaGrid({ appointments, resolveTitle, resolveSubtitle, headerRight, onSelect }: AgendaGridProps) {
  const today = getTodayIsoDate();
  const [weekStart, setWeekStart] = useState(() => getAgendaWeekStart(today));
  // Celular: día que se muestra (0 = lunes). Empieza en hoy si cae en la semana.
  const [dayIndex, setDayIndex] = useState(() => {
    const start = getAgendaWeekStart(today);
    const index = Array.from({ length: 6 }, (_, i) => addDaysToIsoDate(start, i)).indexOf(today);
    return Math.max(index, 0);
  });

  const days = useMemo(() => Array.from({ length: 6 }, (_, index) => addDaysToIsoDate(weekStart, index)), [weekStart]);

  const hours = useMemo(() => Array.from({ length: HOUR_END - HOUR_START }, (_, index) => HOUR_START + index), []);

  const weekLabel = `${toLocalDate(days[0]).toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })} – ${toLocalDate(days[5]).toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' })}`;
  const dayLabel = toLocalDate(days[dayIndex]).toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'short' });

  const moveDay = (delta: 1 | -1) => {
    const next = shiftAgendaDay(weekStart, dayIndex, delta);
    setWeekStart(next.weekStart);
    setDayIndex(next.dayIndex);
  };

  const appointmentsByCell = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    for (const appointment of appointments) {
      const hour = Number(appointment.startTime.split(':')[0]);
      const key = `${appointment.date}-${hour}`;
      const bucket = map.get(key) ?? [];
      bucket.push(appointment);
      map.set(key, bucket);
    }
    return map;
  }, [appointments]);

  return (
    <div className="flex flex-col gap-3 rounded-[14px] border border-adm-line-card bg-white p-4 shadow-soft">
      <div className="flex flex-col gap-2.5 md:flex-row md:flex-wrap md:items-center md:justify-between md:gap-3">
        <div className="flex flex-col gap-2.5 md:hidden">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              aria-label="Día anterior"
              onClick={() => moveDay(-1)}
              className="flex h-11 w-11 items-center justify-center rounded-lg border border-adm-line-control text-adm-ink-400 transition-colors hover:bg-adm-surface-hover"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="text-center text-[15px] font-semibold capitalize text-adm-ink-700">{dayLabel}</span>
            <button
              type="button"
              aria-label="Día siguiente"
              onClick={() => moveDay(1)}
              className="flex h-11 w-11 items-center justify-center rounded-lg border border-adm-line-control text-adm-ink-400 transition-colors hover:bg-adm-surface-hover"
            >
              <ChevronRight size={18} />
            </button>
          </div>
          <div className="grid grid-cols-6 gap-1.5" role="group" aria-label="Día de la semana">
            {days.map((date, index) => (
              <button
                key={date}
                type="button"
                aria-label={`${dayNames[index]} ${Number(date.slice(8, 10))}`}
                aria-pressed={index === dayIndex}
                onClick={() => setDayIndex(index)}
                className={`flex min-h-11 flex-col items-center justify-center rounded-[10px] border text-sm transition-colors ${
                  index === dayIndex
                    ? 'border-brand-600 bg-brand-600 text-white'
                    : `border-adm-line-control text-adm-ink-700 hover:bg-adm-surface-hover ${date === today ? 'bg-adm-surface-hover' : ''}`
                }`}
              >
                <span className="text-xs font-medium leading-none">{dayLabels[index]}</span>
                <span className="font-semibold leading-tight [font-variant-numeric:tabular-nums]">{Number(date.slice(8, 10))}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="hidden items-center gap-1.5 md:flex">
          <button
            type="button"
            aria-label="Semana anterior"
            onClick={() => setWeekStart((current) => addDaysToIsoDate(current, -7))}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-adm-line-control text-adm-ink-400 transition-colors hover:bg-adm-surface-hover"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="min-w-[150px] text-center text-sm font-semibold capitalize text-adm-ink-700">{weekLabel}</span>
          <button
            type="button"
            aria-label="Semana siguiente"
            onClick={() => setWeekStart((current) => addDaysToIsoDate(current, 7))}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-adm-line-control text-adm-ink-400 transition-colors hover:bg-adm-surface-hover"
          >
            <ChevronRight size={16} />
          </button>
        </div>
        {headerRight}
      </div>

      <div className="overflow-x-auto">
        <div className="grid grid-cols-[52px_1fr] md:min-w-[840px] md:grid-cols-[64px_repeat(6,minmax(130px,1fr))]">
          <div className="hidden md:block" />
          {days.map((date, index) => (
            <div
              key={date}
              className={`hidden border-b border-l border-adm-line-div px-2.5 py-3 text-center md:block ${date === today ? 'bg-adm-surface-hover' : ''}`}
            >
              <p className="text-[11px] uppercase tracking-[0.06em] text-adm-ink-300">{dayLabels[index]}</p>
              <p className="text-[15px] font-semibold text-adm-ink-700 [font-variant-numeric:tabular-nums]">{Number(date.slice(8, 10))}</p>
            </div>
          ))}

          {hours.map((hour) => (
            <div key={hour} className="contents">
              <div className="flex h-[62px] items-start justify-end px-2 py-1 text-[13px] text-adm-ink-200 [font-variant-numeric:tabular-nums] md:text-[11px]">
                {String(hour).padStart(2, '0')}:00
              </div>
              {days.map((date, index) => {
                const key = `${date}-${hour}`;
                const cellAppointments = appointmentsByCell.get(key) ?? [];
                return (
                  <div
                    key={key}
                    className={`min-h-[62px] border-b border-adm-line-faint p-[3px] md:block ${index === dayIndex ? '' : 'hidden'}`}
                  >
                    <div className="flex h-full flex-col gap-1">
                      {cellAppointments.map((appointment) => {
                        const style = statusStyles[appointment.status];
                        return (
                          <button
                            key={appointment.id}
                            type="button"
                            onClick={() => onSelect?.(appointment)}
                            className={`w-full overflow-hidden rounded-[7px] border-0 border-l-[3px] px-2 py-1.5 text-left ${style.bg} ${style.text} ${style.solid}`}
                          >
                            <p className="text-[13px] font-semibold opacity-85 [font-variant-numeric:tabular-nums] md:text-[11px]">
                              {appointment.startTime}
                            </p>
                            {resolveTitle && (
                              <p className="truncate text-sm font-semibold md:text-xs">{resolveTitle(appointment)}</p>
                            )}
                            {resolveSubtitle && (
                              <p className="truncate text-[13px] opacity-85 md:text-[11px]">{resolveSubtitle(appointment)}</p>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default AgendaGrid;
