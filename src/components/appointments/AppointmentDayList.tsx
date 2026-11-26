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
        return (
          <section key={group.date} className="flex flex-col gap-2.5" aria-label={formatDateLong(group.date)}>
            <h3 className="flex items-center gap-2 px-1 text-sm">
              {isNear && (
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    relative === 'Hoy' ? 'bg-adm-accent-deep text-white' : 'bg-adm-accent-soft text-adm-accent-ink'
                  }`}
                >
                  {relative}
                </span>
              )}
              <span className="font-semibold capitalize text-adm-ink-700">{formatDateLong(group.date)}</span>
              <span className="text-adm-ink-300">
                · {group.views.length} {group.views.length === 1 ? 'cita' : 'citas'}
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
