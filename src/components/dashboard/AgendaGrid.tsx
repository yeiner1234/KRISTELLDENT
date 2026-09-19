import { useMemo, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Appointment } from '../../types/Appointment';

interface AgendaGridProps {
  appointments: Appointment[];
  resolveTitle?: (appointment: Appointment) => string;
  resolveSubtitle?: (appointment: Appointment) => string;
  headerRight?: ReactNode;
  onSelect?: (appointment: Appointment) => void;
}

const dayLabels = ['L', 'M', 'X', 'J', 'V', 'S'];
const HOUR_START = 8;
const HOUR_END = 19;

const statusStyles: Record<Appointment['status'], { bg: string; text: string; solid: string }> = {
  confirmed: { bg: 'bg-adm-status-confirmed-bg', text: 'text-adm-status-confirmed-text', solid: 'border-adm-status-confirmed-solid' },
  pending: { bg: 'bg-adm-status-pending-bg', text: 'text-adm-status-pending-text', solid: 'border-adm-status-pending-solid' },
  cancelled: { bg: 'bg-adm-status-cancelled-bg', text: 'text-adm-status-cancelled-text', solid: 'border-adm-status-cancelled-solid' },
  completed: { bg: 'bg-adm-status-completed-bg', text: 'text-adm-status-completed-text', solid: 'border-adm-status-completed-solid' },
};

function toIsoDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function mondayOf(date: Date): Date {
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(date);
  monday.setDate(date.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function AgendaGrid({ appointments, resolveTitle, resolveSubtitle, headerRight, onSelect }: AgendaGridProps) {
  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date()));

  const days = useMemo(
    () =>
      Array.from({ length: 6 }, (_, index) => {
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + index);
        return date;
      }),
    [weekStart],
  );

  const hours = useMemo(() => Array.from({ length: HOUR_END - HOUR_START }, (_, index) => HOUR_START + index), []);

  const weekLabel = `${days[0].toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })} – ${days[5].toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' })}`;

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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            aria-label="Semana anterior"
            onClick={() => setWeekStart((current) => new Date(current.getFullYear(), current.getMonth(), current.getDate() - 7))}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-adm-line-control text-adm-ink-400 transition-colors hover:bg-adm-surface-hover"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="min-w-[150px] text-center text-sm font-semibold capitalize text-adm-ink-700">{weekLabel}</span>
          <button
            type="button"
            aria-label="Semana siguiente"
            onClick={() => setWeekStart((current) => new Date(current.getFullYear(), current.getMonth(), current.getDate() + 7))}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-adm-line-control text-adm-ink-400 transition-colors hover:bg-adm-surface-hover"
          >
            <ChevronRight size={16} />
          </button>
        </div>
        {headerRight}
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[840px]" style={{ display: 'grid', gridTemplateColumns: `64px repeat(6, minmax(130px, 1fr))` }}>
          <div />
          {days.map((date, index) => (
            <div key={toIsoDate(date)} className="border-b border-l border-adm-line-div px-2.5 py-3 text-center">
              <p className="text-[11px] uppercase tracking-[0.06em] text-adm-ink-300">{dayLabels[index]}</p>
              <p className="text-[15px] font-semibold text-adm-ink-700 [font-variant-numeric:tabular-nums]">{date.getDate()}</p>
            </div>
          ))}

          {hours.map((hour) => (
            <div key={hour} className="contents">
              <div className="flex h-[62px] items-start justify-end px-2 py-1 text-[11px] text-adm-ink-200 [font-variant-numeric:tabular-nums]">
                {String(hour).padStart(2, '0')}:00
              </div>
              {days.map((date) => {
                const key = `${toIsoDate(date)}-${hour}`;
                const cellAppointments = appointmentsByCell.get(key) ?? [];
                return (
                  <div key={key} className="min-h-[62px] border-b border-adm-line-faint p-[3px]">
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
                            <p className="text-[11px] font-semibold opacity-85 [font-variant-numeric:tabular-nums]">
                              {appointment.startTime}
                            </p>
                            {resolveTitle && (
                              <p className="truncate text-xs font-semibold">{resolveTitle(appointment)}</p>
                            )}
                            {resolveSubtitle && (
                              <p className="truncate text-[11px] opacity-85">{resolveSubtitle(appointment)}</p>
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
