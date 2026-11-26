import { useMemo, useState, type ReactNode } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Appointment } from '../../types/Appointment';
import { addDaysToIsoDate, getAgendaWeekStart, getTodayIsoDate, shiftAgendaDay } from '../../utils/date';
import { formatAppointmentStatus } from '../../utils/format';

interface AgendaGridProps {
  appointments: Appointment[];
  resolveTitle?: (appointment: Appointment) => string;
  resolveSubtitle?: (appointment: Appointment) => string;
  headerRight?: ReactNode;
  onSelect?: (appointment: Appointment) => void;
}

const dayLabels = ['L', 'M', 'X', 'J', 'V', 'S'];
const dayShortNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const dayNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const HOUR_START = 8;
const HOUR_END = 19;

const statusStyles: Record<Appointment['status'], { bg: string; text: string; solid: string; dot: string }> = {
  confirmed: {
    bg: 'bg-adm-status-confirmed-bg',
    text: 'text-adm-status-confirmed-text',
    solid: 'border-adm-status-confirmed-solid',
    dot: 'bg-adm-status-confirmed-solid',
  },
  pending: {
    bg: 'bg-adm-status-pending-bg',
    text: 'text-adm-status-pending-text',
    solid: 'border-adm-status-pending-solid',
    dot: 'bg-adm-status-pending-solid',
  },
  in_room: {
    bg: 'bg-adm-status-in-room-bg',
    text: 'text-adm-status-in-room-text',
    solid: 'border-adm-status-in-room-solid',
    dot: 'bg-adm-status-in-room-solid',
  },
  cancelled: {
    bg: 'bg-adm-status-cancelled-bg',
    text: 'text-adm-status-cancelled-text',
    solid: 'border-adm-status-cancelled-solid',
    dot: 'bg-adm-status-cancelled-solid',
  },
  completed: {
    bg: 'bg-adm-status-completed-bg',
    text: 'text-adm-status-completed-text',
    solid: 'border-adm-status-completed-solid',
    dot: 'bg-adm-status-completed-solid',
  },
};

// Orden de la leyenda de colores.
const legendStatuses: Appointment['status'][] = ['pending', 'confirmed', 'in_room', 'completed', 'cancelled'];

const navButtonClasses =
  'flex items-center justify-center rounded-[10px] border border-adm-line-control bg-white text-adm-ink-400 transition-colors hover:border-adm-accent-line hover:bg-adm-surface-sel hover:text-adm-accent-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-adm-accent-ring';

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

  // Solo informativo: cuántas citas caen en la semana que se ve.
  const weekCount = useMemo(
    () => appointments.filter((appointment) => appointment.date >= days[0] && appointment.date <= days[5]).length,
    [appointments, days],
  );

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-adm-line-card bg-white shadow-soft">
      <div className="flex flex-col gap-3 border-b border-adm-line-div bg-adm-surface-hover px-4 py-3.5 md:flex-row md:flex-wrap md:items-center md:justify-between md:gap-3 md:px-5">
        <div className="flex flex-col gap-2.5 md:hidden">
          <div className="flex items-center justify-between gap-2">
            <button type="button" aria-label="Día anterior" onClick={() => moveDay(-1)} className={`h-11 w-11 ${navButtonClasses}`}>
              <ChevronLeft size={18} />
            </button>
            <div className="flex flex-col items-center">
              <span className="text-center text-[15px] font-semibold capitalize text-adm-ink-700">{dayLabel}</span>
              {days[dayIndex] === today && (
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-brand-600">Hoy</span>
              )}
            </div>
            <button type="button" aria-label="Día siguiente" onClick={() => moveDay(1)} className={`h-11 w-11 ${navButtonClasses}`}>
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
                className={`relative flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl border text-sm transition-colors ${
                  index === dayIndex
                    ? 'border-brand-600 bg-brand-600 text-white shadow-[0_6px_14px_rgba(15,123,134,0.25)]'
                    : `bg-white text-adm-ink-700 hover:bg-adm-surface-sel ${date === today ? 'border-adm-accent-line' : 'border-adm-line-control'}`
                }`}
              >
                <span className={`text-[11px] font-medium leading-none ${index === dayIndex ? 'text-white/80' : 'text-adm-ink-300'}`}>
                  {dayLabels[index]}
                </span>
                <span className="font-semibold leading-tight [font-variant-numeric:tabular-nums]">{Number(date.slice(8, 10))}</span>
                {date === today && index !== dayIndex && (
                  <span aria-hidden="true" className="absolute bottom-1 h-1 w-1 rounded-full bg-brand-600" />
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="hidden items-center gap-1.5 md:flex">
          <span className="mr-1.5 flex h-9 w-9 items-center justify-center rounded-[10px] bg-adm-accent-soft text-adm-accent-deep">
            <CalendarDays size={18} aria-hidden="true" />
          </span>
          <button
            type="button"
            aria-label="Semana anterior"
            onClick={() => setWeekStart((current) => addDaysToIsoDate(current, -7))}
            className={`h-9 w-9 ${navButtonClasses}`}
          >
            <ChevronLeft size={16} />
          </button>
          <span className="min-w-[170px] text-center text-[15px] font-semibold capitalize tracking-[-0.01em] text-adm-ink-700">
            {weekLabel}
          </span>
          <button
            type="button"
            aria-label="Semana siguiente"
            onClick={() => setWeekStart((current) => addDaysToIsoDate(current, 7))}
            className={`h-9 w-9 ${navButtonClasses}`}
          >
            <ChevronRight size={16} />
          </button>
          <span className="ml-1.5 rounded-full border border-adm-line-card bg-white px-2.5 py-0.5 text-xs font-medium text-adm-ink-400 [font-variant-numeric:tabular-nums]">
            {weekCount} {weekCount === 1 ? 'cita' : 'citas'} esta semana
          </span>
        </div>
        {headerRight}
      </div>

      <ul
        aria-label="Leyenda de estados"
        className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-b border-adm-line-div px-4 py-2.5 md:px-5"
      >
        {legendStatuses.map((status) => (
          <li key={status} className="flex items-center gap-1.5 text-xs text-adm-ink-400">
            <span aria-hidden="true" className={`h-2 w-2 rounded-full ${statusStyles[status].dot}`} />
            {formatAppointmentStatus(status)}
          </li>
        ))}
      </ul>

      <div className="overflow-x-auto">
        <div className="grid grid-cols-[56px_1fr] md:min-w-[860px] md:grid-cols-[68px_repeat(6,minmax(130px,1fr))]">
          <div className="hidden border-b border-adm-line-div bg-white md:sticky md:left-0 md:z-10 md:block" />
          {days.map((date, index) => {
            const isToday = date === today;
            return (
              <div
                key={date}
                className={`hidden flex-col items-center gap-1 border-b border-l border-adm-line-div px-2.5 py-3 text-center md:flex ${
                  isToday ? 'bg-adm-surface-sel' : ''
                }`}
              >
                <p className={`text-[11px] font-semibold uppercase tracking-[0.08em] ${isToday ? 'text-brand-600' : 'text-adm-ink-300'}`}>
                  {dayShortNames[index]}
                </p>
                <p
                  className={`flex h-8 min-w-8 items-center justify-center rounded-full px-1 text-base font-semibold [font-variant-numeric:tabular-nums] ${
                    isToday ? 'bg-brand-600 text-white shadow-[0_4px_10px_rgba(15,123,134,0.3)]' : 'text-adm-ink-700'
                  }`}
                >
                  {Number(date.slice(8, 10))}
                </p>
              </div>
            );
          })}

          {hours.map((hour) => (
            <div key={hour} className="contents">
              <div className="flex h-[68px] items-start justify-end border-b border-adm-line-faint bg-white px-2.5 pt-1.5 text-[13px] font-medium text-adm-ink-300 [font-variant-numeric:tabular-nums] md:sticky md:left-0 md:z-10 md:text-[11.5px]">
                {String(hour).padStart(2, '0')}:00
              </div>
              {days.map((date, index) => {
                const key = `${date}-${hour}`;
                const cellAppointments = appointmentsByCell.get(key) ?? [];
                return (
                  <div
                    key={key}
                    className={`min-h-[68px] border-b border-adm-line-faint p-1 md:block md:border-l md:border-l-adm-line-div ${
                      date === today ? 'bg-adm-surface-sel/70' : ''
                    } ${index === dayIndex ? '' : 'hidden'}`}
                  >
                    <div className="flex h-full flex-col gap-1">
                      {cellAppointments.map((appointment) => {
                        const style = statusStyles[appointment.status];
                        return (
                          <button
                            key={appointment.id}
                            type="button"
                            onClick={() => onSelect?.(appointment)}
                            className={`w-full overflow-hidden rounded-lg border-0 border-l-[3px] px-2.5 py-1.5 text-left shadow-[0_1px_2px_rgba(18,35,43,0.06)] transition-[box-shadow,translate] duration-150 hover:-translate-y-px hover:shadow-adm-elev-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 ${style.bg} ${style.text} ${style.solid} ${
                              appointment.status === 'cancelled' ? 'opacity-75' : ''
                            }`}
                          >
                            <p className="flex items-center gap-1.5 text-[13px] font-semibold opacity-85 [font-variant-numeric:tabular-nums] md:text-[11px]">
                              <span aria-hidden="true" className={`h-1.5 w-1.5 shrink-0 rounded-full ${style.dot}`} />
                              {appointment.startTime}
                            </p>
                            {resolveTitle && <p className="truncate text-sm font-semibold md:text-xs">{resolveTitle(appointment)}</p>}
                            {resolveSubtitle && (
                              <p className="truncate text-[13px] opacity-80 md:text-[11px]">{resolveSubtitle(appointment)}</p>
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
