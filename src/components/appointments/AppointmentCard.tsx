import { CalendarDays, Clock, Stethoscope } from 'lucide-react';
import type { Appointment } from '../../types/Appointment';
import { formatDateLong, formatTimeRange } from '../../utils/date';
import AppointmentStatus from './AppointmentStatus';

interface AppointmentCardProps {
  appointment: Appointment;
  professionalName?: string;
}

function AppointmentCard({ appointment, professionalName }: AppointmentCardProps) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 text-brand-700">
          <Stethoscope size={18} />
          <span className="font-semibold">{professionalName ?? 'Profesional asignado'}</span>
        </div>
        <AppointmentStatus status={appointment.status} />
      </div>

      <div className="flex flex-wrap gap-4 text-sm text-ink-secondary">
        <span className="flex items-center gap-1.5 capitalize">
          <CalendarDays size={16} />
          {formatDateLong(appointment.date)}
        </span>
        <span className="flex items-center gap-1.5">
          <Clock size={16} />
          {formatTimeRange(appointment.startTime, appointment.endTime)}
        </span>
      </div>

      {appointment.reason && <p className="text-sm text-ink-tertiary">Motivo: {appointment.reason}</p>}
    </div>
  );
}

export default AppointmentCard;
