import { CalendarX2, Clock, Moon, Sparkles, type LucideIcon } from 'lucide-react';
import type { PatientAlert } from '../../utils/patientSummary';

const alertStyles: Record<PatientAlert, { label: string; icon: LucideIcon; className: string }> = {
  unconfirmed: {
    label: 'Por confirmar',
    icon: Clock,
    className: 'bg-adm-status-pending-bg text-adm-status-pending-text border-adm-status-pending-border',
  },
  new: {
    label: 'Paciente nuevo',
    icon: Sparkles,
    className: 'bg-adm-status-in-room-bg text-adm-status-in-room-text border-adm-status-in-room-border',
  },
  cancellations: {
    label: 'Cancela seguido',
    icon: CalendarX2,
    className: 'bg-adm-status-cancelled-bg text-adm-status-cancelled-text border-adm-status-cancelled-border',
  },
  inactive: {
    label: 'Inactivo +6 meses',
    icon: Moon,
    className: 'bg-adm-status-completed-bg text-adm-status-completed-text border-adm-status-completed-border',
  },
};

function PatientAlertChip({ alert }: { alert: PatientAlert }) {
  const { label, icon: Icon, className } = alertStyles[alert];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11.5px] font-semibold ${className}`}
    >
      <Icon size={12} aria-hidden="true" />
      {label}
    </span>
  );
}

export default PatientAlertChip;
