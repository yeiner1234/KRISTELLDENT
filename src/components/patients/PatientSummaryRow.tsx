import { ChevronRight } from 'lucide-react';
import Avatar from '../common/Avatar';
import AppointmentStatus from '../appointments/AppointmentStatus';
import PatientAlertChip from './PatientAlertChip';
import type { AppointmentStatus as AppointmentStatusType } from '../../types/Appointment';
import { formatDaysAgo, formatRelativeDay, type PatientSummary } from '../../utils/patientSummary';

interface PatientSummaryRowProps {
  summary: PatientSummary;
  todayIso: string;
  onOpen: (summary: PatientSummary) => void;
}

// Franja de color a la izquierda: el estado de la cita de hoy.
const todayAccent: Record<AppointmentStatusType, string> = {
  pending: 'before:bg-adm-status-pending-solid',
  confirmed: 'before:bg-adm-status-confirmed-solid',
  in_room: 'before:bg-adm-status-in-room-solid',
  completed: 'before:bg-adm-status-completed-solid',
  cancelled: 'before:bg-transparent',
};

const labelClass = 'text-[11px] font-semibold uppercase tracking-[0.06em] text-adm-ink-200';

function Counter({ value, label, dot }: { value: number; label: string; dot: string }) {
  return (
    <div className="flex items-center gap-1.5" title={label}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} aria-hidden="true" />
      <span className="text-sm font-semibold text-adm-ink-700 [font-variant-numeric:tabular-nums]">{value}</span>
      <span className="text-xs text-adm-ink-300">{label}</span>
    </div>
  );
}

function PatientSummaryRow({ summary, todayIso, onOpen }: PatientSummaryRowProps) {
  const { patient, fullName, today, next, lastVisit, daysSinceLastVisit, counts, alerts } = summary;
  const accent = today ? todayAccent[today.appointment.status] : 'before:bg-transparent';
  const shown = today ?? next;

  return (
    <button
      type="button"
      onClick={() => onOpen(summary)}
      aria-label={`Ver ficha de ${fullName}`}
      className={`group relative grid w-full gap-4 overflow-hidden rounded-[14px] border border-adm-line-card bg-white p-4 text-left shadow-soft transition-all before:absolute before:inset-y-0 before:left-0 before:w-1 hover:border-adm-accent-line hover:shadow-adm-elev-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-adm-accent-ring sm:px-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-center ${accent}`}
    >
      {/* Paciente */}
      <div className="flex min-w-0 items-start gap-3">
        <Avatar name={fullName} path={null} className="h-11 w-11 text-sm" />
        <div className="flex min-w-0 flex-col gap-1">
          <p className="truncate text-[15px] font-semibold text-adm-ink-700">{fullName}</p>
          <p className="text-xs text-adm-ink-300 [font-variant-numeric:tabular-nums]">
            DNI {patient.dni}
            {patient.phone && <> · {patient.phone}</>}
          </p>
          {alerts.length > 0 && (
            <div className="mt-0.5 flex flex-wrap gap-1">
              {alerts.map((alert) => (
                <PatientAlertChip key={alert} alert={alert} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Próxima cita */}
      <div className="flex min-w-0 flex-col gap-1 border-t border-adm-line-div pt-3 lg:border-t-0 lg:pt-0">
        <span className={labelClass}>{today ? 'Cita de hoy' : 'Próxima cita'}</span>
        {shown ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-adm-ink-700 [font-variant-numeric:tabular-nums]">
                {formatRelativeDay(shown.appointment.date, todayIso)} · {shown.appointment.startTime}
              </span>
              <AppointmentStatus status={shown.appointment.status} theme="admin" />
            </div>
            <span className="truncate text-xs text-adm-ink-400">
              {shown.serviceName} · {shown.professionalName}
            </span>
          </>
        ) : (
          <span className="text-sm text-adm-ink-200">Sin cita programada</span>
        )}
      </div>

      {/* Última visita */}
      <div className="flex min-w-0 flex-col gap-1">
        <span className={labelClass}>Última visita</span>
        {lastVisit && daysSinceLastVisit !== null ? (
          <>
            <span className="truncate text-sm font-medium text-adm-ink-700">
              {formatRelativeDay(lastVisit.appointment.date, todayIso)} · {lastVisit.serviceName}
            </span>
            <span
              className={`text-xs ${daysSinceLastVisit > 180 ? 'font-semibold text-adm-status-cancelled-text' : 'text-adm-ink-400'}`}
            >
              {formatDaysAgo(daysSinceLastVisit)}
            </span>
          </>
        ) : (
          <span className="text-sm text-adm-ink-200">Aún no atendido</span>
        )}
      </div>

      {/* Historial */}
      <div className="flex items-center justify-between gap-4 lg:justify-end">
        <div className="flex flex-wrap gap-x-4 gap-y-1 lg:flex-col lg:gap-1">
          <Counter value={counts.completed} label="atendidas" dot="bg-adm-status-confirmed-solid" />
          <Counter value={counts.cancelled} label="canceladas" dot="bg-adm-status-cancelled-solid" />
          <Counter value={counts.upcoming} label="pendientes" dot="bg-adm-status-pending-solid" />
        </div>
        <ChevronRight
          size={18}
          aria-hidden="true"
          className="shrink-0 text-adm-ink-100 transition-transform group-hover:translate-x-0.5 group-hover:text-adm-accent-deep"
        />
      </div>
    </button>
  );
}

export default PatientSummaryRow;
