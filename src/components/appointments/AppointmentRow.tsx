import { Eye, MapPin } from 'lucide-react';
import Avatar from '../common/Avatar';
import AppointmentStatus from './AppointmentStatus';
import AppointmentActionButtons from './AppointmentActionButtons';
import type { Appointment, AppointmentStatus as AppointmentStatusType } from '../../types/Appointment';
import type { AppRole } from '../../types/User';
import type { AppointmentAction } from '../../utils/appointmentActions';
import type { AppointmentView } from '../../utils/appointmentViews';

interface AppointmentRowProps {
  view: AppointmentView;
  role: AppRole;
  busy: boolean;
  onAction: (appointment: Appointment, action: AppointmentAction) => void;
  onOpen?: (appointment: Appointment) => void;
  // Sin profesional en "Mis citas": siempre es quien mira.
  showProfessional?: boolean;
  // Nombre de la sede; sin él no se muestra.
  branchName?: string;
}

// Franja de color a la izquierda según el estado.
const accentByStatus: Record<AppointmentStatusType, string> = {
  pending: 'before:bg-adm-status-pending-solid',
  confirmed: 'before:bg-adm-status-confirmed-solid',
  in_room: 'before:bg-adm-status-in-room-solid',
  completed: 'before:bg-adm-status-completed-solid',
  cancelled: 'before:bg-adm-status-cancelled-solid',
};

// Una cita como tarjeta: hora grande, paciente, servicio, estado y acciones.
// En celular se apila; desde lg es una fila.
function AppointmentRow({
  view,
  role,
  busy,
  onAction,
  onOpen,
  showProfessional = true,
  branchName,
}: AppointmentRowProps) {
  const { appointment, patientName, patientDni, professionalName, serviceName } = view;
  const isCancelled = appointment.status === 'cancelled';

  return (
    <article
      data-appointment-row
      className={`relative grid gap-3 overflow-hidden rounded-[14px] border border-adm-line-card bg-white p-4 pl-5 shadow-soft transition-shadow before:absolute before:inset-y-0 before:left-0 before:w-1 hover:shadow-adm-elev-1 lg:grid-cols-[88px_minmax(0,1.3fr)_minmax(0,1.2fr)_auto_auto] lg:items-center lg:gap-5 ${accentByStatus[appointment.status]}`}
    >
      {/* Hora */}
      <div className="flex items-baseline gap-2 lg:flex-col lg:gap-0">
        <span
          className={`text-lg font-semibold leading-tight text-adm-ink-700 [font-variant-numeric:tabular-nums] ${isCancelled ? 'line-through decoration-adm-ink-200' : ''}`}
        >
          {appointment.startTime}
        </span>
        <span className="text-xs text-adm-ink-300 [font-variant-numeric:tabular-nums]">hasta {appointment.endTime}</span>
      </div>

      {/* Paciente */}
      <div className="flex min-w-0 items-center gap-3">
        <Avatar name={patientName} path={null} className="h-10 w-10 text-[13px]" />
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-semibold text-adm-ink-700">{patientName}</span>
          <span className="text-xs text-adm-ink-300 [font-variant-numeric:tabular-nums]">
            {patientDni && <span>DNI {patientDni}</span>}
            {patientDni && ' · '}
            <span className="font-medium text-adm-ink-400">{appointment.code}</span>
          </span>
        </div>
      </div>

      {/* Servicio */}
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate text-sm font-medium text-adm-ink-700">{serviceName}</span>
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-adm-ink-400">
          {showProfessional && <span>{professionalName}</span>}
          {branchName && (
            <span
              aria-label={`Sede: ${branchName}`}
              className="inline-flex items-center gap-1 rounded-full bg-adm-surface-app px-2 py-0.5 font-medium text-adm-ink-400"
            >
              <MapPin size={11} aria-hidden="true" />
              {branchName}
            </span>
          )}
        </span>
        {appointment.reason.trim() && (
          <span className="truncate text-xs italic text-adm-ink-300">“{appointment.reason.trim()}”</span>
        )}
      </div>

      {/* Estado */}
      <div>
        <AppointmentStatus status={appointment.status} theme="admin" />
      </div>

      {/* Acciones */}
      <div className="flex flex-wrap items-center gap-1.5 lg:justify-end">
        {onOpen && (
          <button
            type="button"
            onClick={() => onOpen(appointment)}
            aria-label="Ver detalle de la cita"
            className="flex h-9 w-9 items-center justify-center rounded-[8px] border border-adm-line-control text-adm-ink-400 transition-colors hover:border-adm-accent-line hover:bg-adm-surface-sel hover:text-adm-accent-deep"
          >
            <Eye size={16} />
          </button>
        )}
        <AppointmentActionButtons appointment={appointment} role={role} busy={busy} onAction={onAction} />
      </div>
    </article>
  );
}

export default AppointmentRow;
