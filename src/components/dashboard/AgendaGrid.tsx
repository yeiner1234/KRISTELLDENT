import { useMemo, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Appointment } from '../../types/Appointment';
import { mondayOf, toLocalIsoDate as toIsoDate } from '../../utils/date';
import { segmentInHour, type AvailabilityBlock, type AvailabilityKind } from '../../utils/agendaAvailability';

interface AgendaGridProps {
  appointments: Appointment[];
  // Horario del profesional elegido; sin él la agenda solo muestra citas.
  availability?: (isoDate: string) => AvailabilityBlock[];
  // Semana visible controlada desde la página (para cargar sus datos).
  weekStart?: Date;
  onWeekStartChange?: (weekStart: Date) => void;
  resolveTitle?: (appointment: Appointment) => string;
  resolveSubtitle?: (appointment: Appointment) => string;
  headerRight?: ReactNode;
  onSelect?: (appointment: Appointment) => void;
}

const dayLabels = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const HOUR_START = 8;
const HOUR_END = 19;

const statusStyles: Record<Appointment['status'], { bg: string; text: string; solid: string }> = {
  confirmed: { bg: 'bg-adm-status-confirmed-bg', text: 'text-adm-status-confirmed-text', solid: 'border-adm-status-confirmed-solid' },
  pending: { bg: 'bg-adm-status-pending-bg', text: 'text-adm-status-pending-text', solid: 'border-adm-status-pending-solid' },
  in_room: { bg: 'bg-adm-status-in-room-bg', text: 'text-adm-status-in-room-text', solid: 'border-adm-status-in-room-solid' },
  cancelled: { bg: 'bg-adm-status-cancelled-bg', text: 'text-adm-status-cancelled-text', solid: 'border-adm-status-cancelled-solid' },
  completed: { bg: 'bg-adm-status-completed-bg', text: 'text-adm-status-completed-text', solid: 'border-adm-status-completed-solid' },
};

const availabilityStyles: Record<AvailabilityKind, { label: string; className: string }> = {
  work: { label: 'Horario de trabajo', className: 'bg-adm-accent-soft' },
  absence: {
    label: 'Ausencia',
    className: 'bg-[repeating-linear-gradient(135deg,#eef1f3_0_6px,#e2e7ea_6px_12px)]',
  },
  extra: { label: 'Turno extra', className: 'bg-adm-status-confirmed-bg' },
};

function AgendaGrid({
  appointments,
  availability,
  weekStart: controlledWeekStart,
  onWeekStartChange,
  resolveTitle,
  resolveSubtitle,
  headerRight,
  onSelect,
}: AgendaGridProps) {
  const [ownWeekStart, setOwnWeekStart] = useState(() => mondayOf(new Date()));
  const weekStart = controlledWeekStart ?? ownWeekStart;
  const moveWeek = (offsetDays: number) => {
    const next = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + offsetDays);
    setOwnWeekStart(next);
    onWeekStartChange?.(next);
  };

  const days = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) => {
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + index);
        return date;
      }),
    [weekStart],
  );

  const hours = useMemo(() => Array.from({ length: HOUR_END - HOUR_START }, (_, index) => HOUR_START + index), []);

  const weekLabel = `${days[0].toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })} – ${days[6].toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' })}`;

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

  const availabilityByDate = useMemo(
    () => new Map(days.map((date) => [toIsoDate(date), availability?.(toIsoDate(date)) ?? []])),
    [days, availability],
  );

  return (
    <div className="flex flex-col gap-3 rounded-[14px] border border-adm-line-card bg-white p-4 shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            aria-label="Semana anterior"
            onClick={() => moveWeek(-7)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-adm-line-control text-adm-ink-400 transition-colors hover:bg-adm-surface-hover"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="min-w-[150px] text-center text-sm font-semibold capitalize text-adm-ink-700">{weekLabel}</span>
          <button
            type="button"
            aria-label="Semana siguiente"
            onClick={() => moveWeek(7)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-adm-line-control text-adm-ink-400 transition-colors hover:bg-adm-surface-hover"
          >
            <ChevronRight size={16} />
          </button>
        </div>
        {headerRight}
      </div>

      {availability && (
        <div className="flex flex-wrap items-center gap-4 text-[12px] text-adm-ink-400">
          {(Object.keys(availabilityStyles) as AvailabilityKind[]).map((kind) => (
            <span key={kind} className="flex items-center gap-1.5">
              <span className={`h-3 w-3 rounded-[3px] border border-adm-line-div ${availabilityStyles[kind].className}`} />
              {availabilityStyles[kind].label}
            </span>
          ))}
        </div>
      )}

      <div className="overflow-x-auto">
        <div className="min-w-[840px]" style={{ display: 'grid', gridTemplateColumns: `64px repeat(7, minmax(120px, 1fr))` }}>
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
                const blocks = availabilityByDate.get(toIsoDate(date)) ?? [];
                return (
                  <div key={key} className="relative min-h-[62px] border-b border-adm-line-faint p-[3px]">
                    {blocks.map((block) => {
                      const segment = segmentInHour(block, hour);
                      if (!segment) return null;
                      const style = availabilityStyles[block.kind];
                      return (
                        <div
                          key={`${block.kind}-${block.start}`}
                          title={`${style.label} ${block.start}–${block.end}`}
                          className={`pointer-events-none absolute inset-x-0 ${style.className}`}
                          style={{ top: `${segment.topPct}%`, height: `${segment.heightPct}%` }}
                        />
                      );
                    })}
                    <div className="relative flex h-full flex-col gap-1">
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
