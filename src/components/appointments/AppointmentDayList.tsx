import type { ReactNode } from 'react';
import { groupAppointmentViewsByDate, type AppointmentView } from '../../utils/appointmentViews';
import { formatDateLong } from '../../utils/date';
import { formatRelativeDay } from '../../utils/patientSummary';

interface AppointmentDayListProps {
  views: AppointmentView[];
  todayIso: string;
  renderRow: (view: AppointmentView) => ReactNode;
}

// Citas agrupadas por día, con un encabezado "Hoy · miércoles, 25 de
// noviembre" y cuántas citas tiene ese día.
function AppointmentDayList({ views, todayIso, renderRow }: AppointmentDayListProps) {
  return (
    <div className="flex flex-col gap-6">
      {groupAppointmentViewsByDate(views).map((group) => {
        const relative = formatRelativeDay(group.date, todayIso);
        const isNear = ['Hoy', 'Mañana', 'Ayer'].includes(relative);
        const isToday = relative === 'Hoy';
        return (
          <section key={group.date} className="flex flex-col gap-3" aria-label={formatDateLong(group.date)}>
            <h3 className="flex flex-wrap items-center gap-2.5 px-1 text-sm">
              <span
                aria-hidden="true"
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[15px] font-semibold [font-variant-numeric:tabular-nums] ${
                  isToday
                    ? 'bg-brand-600 text-white shadow-[0_4px_10px_rgba(15,123,134,0.3)]'
                    : 'border border-adm-line-card bg-white text-adm-ink-700'
                }`}
              >
                {Number(group.date.slice(8, 10))}
              </span>
              {isNear && (
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.06em] ${
                    isToday ? 'bg-adm-accent-soft text-brand-600' : 'bg-adm-line-faint text-adm-ink-400'
                  }`}
                >
                  {relative}
                </span>
              )}
              <span className="font-semibold capitalize text-adm-ink-700">{formatDateLong(group.date)}</span>
              <span className="rounded-full border border-adm-line-card bg-white px-2.5 py-0.5 text-xs font-medium text-adm-ink-400 [font-variant-numeric:tabular-nums]">
                {group.views.length} {group.views.length === 1 ? 'cita' : 'citas'}
              </span>
            </h3>
            <ul className="flex flex-col gap-2.5">
              {group.views.map((view) => (
                <li key={view.appointment.id}>{renderRow(view)}</li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

export default AppointmentDayList;
