import { CalendarDays, Clock, MapPin, Stethoscope, UserRound } from 'lucide-react';
import type { PatientAppointment } from '../../types/Appointment';
import { formatDateLong, formatTimeRange } from '../../utils/date';
import AppointmentStatus from './AppointmentStatus';
import Button from '../common/Button';

interface PatientAppointmentCardProps {
  appointment: PatientAppointment;
  // Sin acciones (cita atendida, en sala, cancelada o pasada) no hay botones.
  canModify: boolean;
  onReschedule: () => void;
  onCancel: () => void;
}

function PatientAppointmentCard({ appointment, canModify, onReschedule, onCancel }: PatientAppointmentCardProps) {
  return (
    <article
      aria-label={`Cita ${appointment.code}`}
      className="flex flex-col gap-3 rounded-2xl border border-border bg-white p-5 shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <span className="font-mono text-sm font-bold tracking-wider text-brand-900">{appointment.code}</span>
          <span className="flex items-center gap-1.5 font-semibold text-brand-700">
            <Stethoscope size={16} />
            {appointment.serviceName ?? 'Consulta'}
            {appointment.serviceDuration ? ` (${appointment.serviceDuration} min)` : ''}
          </span>
        </div>
        <AppointmentStatus status={appointment.status} />
      </div>

      <div className="grid gap-2 text-sm text-ink-secondary sm:grid-cols-2">
        <span className="flex items-center gap-1.5 capitalize">
          <CalendarDays size={16} />
          {formatDateLong(appointment.date)}
        </span>
        <span className="flex items-center gap-1.5">
          <Clock size={16} />
          {formatTimeRange(appointment.startTime, appointment.endTime)}
        </span>
        <span className="flex items-center gap-1.5">
          <MapPin size={16} />
          {appointment.branchName ?? 'Sede'}
        </span>
        <span className="flex items-center gap-1.5">
          <UserRound size={16} />
          {appointment.professionalName ?? 'Profesional asignado'}
        </span>
      </div>

      {canModify && (
        <div className="flex flex-wrap gap-2 border-t border-border pt-3">
          <Button type="button" size="sm" onClick={onReschedule}>
            Reprogramar
          </Button>
          <Button type="button" size="sm" variant="secondary" onClick={onCancel}>
            Cancelar cita
          </Button>
        </div>
      )}
    </article>
  );
}

export default PatientAppointmentCard;
