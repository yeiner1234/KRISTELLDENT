import { CalendarDays, Clock, Stethoscope } from 'lucide-react';
import type { Appointment } from '../../types/Appointment';
import { formatDateLong, formatTimeRange } from '../../utils/date';
import AppointmentStatus from './AppointmentStatus';
import Button from '../common/Button';

interface AppointmentCardProps {
  appointment: Appointment;
  professionalName?: string;
  specialtyName?: string;
  variant?: 'public' | 'admin';
}

function dayNumber(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00`).getDate().toString();
}

function monthAbbreviation(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString('es-PE', { month: 'short' }).replace('.', '');
}

function AppointmentCard({ appointment, professionalName, specialtyName, variant = 'public' }: AppointmentCardProps) {
  if (variant === 'admin') {
    return (
      <div className="flex flex-wrap items-center gap-[18px] rounded-[14px] border border-adm-line-card bg-white p-[18px_20px] shadow-soft">
        <div className="flex min-w-[58px] flex-col items-center border-r border-adm-line-div pr-[18px]">
          <span className="text-[22px] font-semibold tracking-[-0.02em] text-adm-ink-700 [font-variant-numeric:tabular-nums]">
            {dayNumber(appointment.date)}
          </span>
          <span className="text-xs font-normal uppercase tracking-[0.06em] text-adm-ink-300">
            {monthAbbreviation(appointment.date)}
          </span>
        </div>

        <div className="flex min-w-[160px] flex-1 flex-col gap-0.5">
          <p className="text-[15px] font-semibold text-adm-ink-700">{appointment.reason || 'Cita'}</p>
          <p className="text-sm text-adm-ink-400">
            {professionalName ?? 'Profesional asignado'}
            {specialtyName ? ` · ${specialtyName}` : ''}
          </p>
        </div>

        <span className="flex items-center gap-1.5 text-sm font-medium text-adm-ink-300 [font-variant-numeric:tabular-nums]">
          <Clock size={14} />
          {formatTimeRange(appointment.startTime, appointment.endTime)}
        </span>

        <AppointmentStatus status={appointment.status} theme="admin" />

        <Button type="button" variant="admin-outline" size="sm">
          Reprogramar
        </Button>
      </div>
    );
  }

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
