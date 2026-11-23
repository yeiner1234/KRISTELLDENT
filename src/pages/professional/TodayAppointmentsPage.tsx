import { useMemo } from 'react';
import { CalendarX2 } from 'lucide-react';
import SectionTitle from '../../components/common/SectionTitle';
import EmptyState from '../../components/common/EmptyState';
import Spinner from '../../components/common/Spinner';
import AppointmentStatus from '../../components/appointments/AppointmentStatus';
import AppointmentActionButtons from '../../components/appointments/AppointmentActionButtons';
import BranchTag from '../../components/appointments/BranchTag';
import { useAuth } from '../../hooks/useAuth';
import { useAllAppointments } from '../../hooks/useAppointments';
import { useAppointmentStatusAction } from '../../hooks/useAppointmentStatusAction';
import { useAllPatients } from '../../hooks/usePatients';
import { useProfessionals } from '../../hooks/useProfessionals';
import { useServices } from '../../hooks/useServices';
import { usePanelBranch } from '../../hooks/usePanelBranch';
import { filterByPanelBranch } from '../../utils/panelBranch';
import { ACTION_TARGET_STATUS, type AppointmentAction } from '../../utils/appointmentActions';
import { buildAppointmentViews, filterAppointmentViews } from '../../utils/appointmentViews';
import { formatDateLong, formatTimeRange, getTodayIsoDate } from '../../utils/date';
import type { Appointment } from '../../types/Appointment';

// Pantalla principal de la técnica: las citas de hoy de su sede (la RLS solo
// le devuelve esas) para marcar la llegada del paciente.
function TodayAppointmentsPage() {
  const { user } = useAuth();
  const role = user?.role ?? 'tecnica';
  const { appointments, isLoading: isLoadingAppointments, error: appointmentsError, refetch } = useAllAppointments();
  const { patients, isLoading: isLoadingPatients, error: patientsError } = useAllPatients();
  // La técnica no puede leer profiles: los nombres salen de get_public_professionals.
  const { professionals, error: professionalsError } = useProfessionals();
  const { services, error: servicesError } = useServices();
  const statusAction = useAppointmentStatusAction(refetch);
  const today = getTodayIsoDate();
  const isLoading = isLoadingAppointments || isLoadingPatients;
  const loadError = appointmentsError ?? patientsError ?? professionalsError ?? servicesError;

  const { selectedBranchId } = usePanelBranch();

  const todayViews = useMemo(
    () =>
      filterAppointmentViews(
        buildAppointmentViews(filterByPanelBranch(appointments, selectedBranchId), { patients, professionals, services }),
        { date: today },
      ),
    [appointments, selectedBranchId, patients, professionals, services, today],
  );

  const handleAction = (appointment: Appointment, action: AppointmentAction) => {
    if (action !== 'reschedule') {
      void statusAction.run(appointment, ACTION_TARGET_STATUS[action]);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionTitle title="Citas de hoy" align="left" />
        <span className="text-[13px] capitalize text-adm-ink-300">
          {formatDateLong(today)} · {todayViews.length} {todayViews.length === 1 ? 'cita' : 'citas'}
        </span>
      </div>

      {statusAction.error && (
        <p
          role="alert"
          className="rounded-[10px] border border-adm-status-cancelled-border bg-adm-status-cancelled-bg px-3.5 py-2.5 text-sm font-medium text-adm-danger-text"
        >
          {statusAction.error}
        </p>
      )}

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Spinner size={28} />
        </div>
      ) : loadError ? (
        <EmptyState icon={CalendarX2} title="No se pudieron cargar las citas" description={loadError} />
      ) : todayViews.length === 0 ? (
        <EmptyState icon={CalendarX2} title="Sin citas hoy" description="No hay citas programadas para hoy en tu sede." />
      ) : (
        <div className="rounded-[14px] border border-adm-line-card bg-white">
          {todayViews.map((view) => (
            <div
              key={view.appointment.id}
              data-testid="today-appointment"
              className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-adm-line-div p-[14px_20px] first:border-t-0"
            >
              <span className="w-[100px] text-sm font-semibold text-adm-ink-700 [font-variant-numeric:tabular-nums]">
                {formatTimeRange(view.appointment.startTime, view.appointment.endTime)}
              </span>
              <div className="flex min-w-[160px] flex-1 flex-col">
                <span className="text-sm font-medium text-adm-ink-700">{view.patientName}</span>
                <span className="text-[13px] text-adm-ink-400">
                  {view.patientDni && `DNI ${view.patientDni} · `}
                  <span>{view.appointment.code}</span>
                </span>
              </div>
              <div className="flex min-w-[140px] flex-col">
                <span className="text-sm text-adm-ink-700">{view.professionalName}</span>
                <span className="text-[13px] text-adm-ink-400">{view.serviceName}</span>
              </div>
              <BranchTag branchId={view.appointment.branchId} />
              <AppointmentStatus status={view.appointment.status} theme="admin" />
              <AppointmentActionButtons
                appointment={view.appointment}
                role={role}
                busy={statusAction.pendingId === view.appointment.id}
                onAction={handleAction}
                size="sm"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default TodayAppointmentsPage;
