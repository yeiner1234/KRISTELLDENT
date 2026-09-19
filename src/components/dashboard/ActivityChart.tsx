import { useMemo } from 'react';
import type { Appointment } from '../../types/Appointment';

interface ActivityChartProps {
  appointments: Appointment[];
}

const CHART_HEIGHT = 170;

function lastSevenDays(): Date[] {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    date.setHours(0, 0, 0, 0);
    return date;
  });
}

function toIsoDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function ActivityChart({ appointments }: ActivityChartProps) {
  const days = useMemo(() => lastSevenDays(), []);

  const counts = useMemo(
    () =>
      days.map((date) => {
        const iso = toIsoDate(date);
        const dayAppointments = appointments.filter((appointment) => appointment.date === iso);
        return {
          date,
          confirmed: dayAppointments.filter((appointment) => appointment.status === 'confirmed').length,
          cancelled: dayAppointments.filter((appointment) => appointment.status === 'cancelled').length,
        };
      }),
    [appointments, days],
  );

  const max = Math.max(1, ...counts.map((day) => day.confirmed + day.cancelled));

  return (
    <div className="flex flex-col gap-3.5 rounded-[14px] border border-adm-line-card bg-white p-[18px_20px] shadow-soft">
      <p className="text-sm font-semibold text-adm-ink-700">Actividad de la semana</p>

      <div className="flex items-end gap-3" style={{ height: CHART_HEIGHT }}>
        {counts.map(({ date, confirmed, cancelled }) => (
          <div key={toIsoDate(date)} className="flex flex-1 flex-col items-center gap-2">
            <div className="flex h-full w-full items-end justify-center gap-[3px]">
              <div
                className="w-full rounded-t-[5px] bg-brand-600"
                style={{ height: `${(confirmed / max) * (CHART_HEIGHT - 20)}px`, minHeight: confirmed > 0 ? 4 : 0 }}
              />
              <div
                className="w-full rounded-t-[5px]"
                style={{
                  height: `${(cancelled / max) * (CHART_HEIGHT - 20)}px`,
                  minHeight: cancelled > 0 ? 4 : 0,
                  backgroundColor: '#e7b8b3',
                }}
              />
            </div>
            <span className="text-[11px] capitalize text-adm-ink-300">
              {date.toLocaleDateString('es-PE', { weekday: 'short' }).replace('.', '')}
            </span>
          </div>
        ))}
      </div>

      <div className="flex gap-5 border-t border-adm-line-div pt-3.5">
        <span className="flex items-center gap-2 text-xs text-adm-ink-400">
          <span className="h-[9px] w-[9px] rounded-[3px] bg-brand-600" />
          Confirmadas
        </span>
        <span className="flex items-center gap-2 text-xs text-adm-ink-400">
          <span className="h-[9px] w-[9px] rounded-[3px]" style={{ backgroundColor: '#e7b8b3' }} />
          Canceladas
        </span>
      </div>
    </div>
  );
}

export default ActivityChart;
