import { useMemo } from 'react';
import { CalendarX2 } from 'lucide-react';
import SectionTitle from '../../components/common/SectionTitle';
import EmptyState from '../../components/common/EmptyState';
import Spinner from '../../components/common/Spinner';
import AppointmentStatus from '../../components/appointments/AppointmentStatus';
import AppointmentActionButtons from '../../components/appointments/AppointmentActionButtons';
import BranchTag from '../../components/appointments/BranchTag';
import { useAuth } from '../../hooks/useAuth';
import { useMyAppointments } from '../../hooks/useAppointments';
import { useAppointmentStatusAction } from '../../hooks/useAppointmentStatusAction';
import { useAllPatients } from '../../hooks/usePatients';
import { useServices } from '../../hooks/useServices';
import { usePanelBranch } from '../../hooks/usePanelBranch';
import { filterByPanelBranch } from '../../utils/panelBranch';
import { ACTION_TARGET_STATUS, type AppointmentAction } from '../../utils/appointmentActions';
import { buildAppointmentViews } from '../../utils/appointmentViews';
import { formatDateLong, formatTimeRange } from '../../utils/date';
import type { Appointment } from '../../types/Appointment';

function MyAppointmentsPage() {
  const { user } = useAuth();
  const role = user?.role ?? 'especialista';
  const { appointments, isLoading: isLoadingAppointments, error: appointmentsError, refetch } = useMyAppointments(user?.id);
  const { patients, isLoading: isLoadingPatients, error: patientsError } = useAllPatients();
  const { services, error: servicesError } = useServices();
  const error = appointmentsError ?? patientsError ?? servicesError;
  const statusAction = useAppointmentStatusAction(refetch);
  const isLoading = isLoadingAppointments || isLoadingPatients;
  const { selectedBranchId } = usePanelBranch();

  // Las más recientes primero, de la sede elegida arriba.
  const views = useMemo(
    () =>
      buildAppointmentViews(filterByPanelBranch(appointments, selectedBranchId), {
        patients,
        professionals: [],
        services,
      }).reverse(),
    [appointments, selectedBranchId, patients, services],
  );

  const handleAction = (appointment: Appointment, action: AppointmentAction) => {
    if (action !== 'reschedule') {
      void statusAction.run(appointment, ACTION_TARGET_STATUS[action]);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionTitle title="Mis citas" align="left" />
        <span className="text-[13px] text-adm-ink-300">{views.length} citas</span>
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
      ) : error ? (
        <EmptyState icon={CalendarX2} title="No se pudieron cargar tus citas" description={error} />
      ) : views.length === 0 ? (
        <EmptyState
          icon={CalendarX2}
          title="Sin citas registradas"
          description="Cuando tengas citas asignadas, aparecerán en esta lista."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {views.map((view) => (
            <div
              key={view.appointment.id}
              className="flex flex-wrap items-center gap-x-[18px] gap-y-2 rounded-[14px] border border-adm-line-card bg-white p-[16px_20px] shadow-soft"
            >
              <div className="flex min-w-[170px] flex-col">
                <span className="text-sm font-semibold capitalize text-adm-ink-700">{formatDateLong(view.appointment.date)}</span>
                <span className="text-sm text-adm-ink-400 sm:text-[13px] [font-variant-numeric:tabular-nums]">
                  {formatTimeRange(view.appointment.startTime, view.appointment.endTime)} · {view.appointment.code}
                </span>
              </div>
              <div className="flex min-w-[160px] flex-1 flex-col">
                <span className="text-sm font-medium text-adm-ink-700">{view.patientName}</span>
                <span className="text-sm text-adm-ink-400 sm:text-[13px]">{view.serviceName}</span>
              </div>
              <BranchTag branchId={view.appointment.branchId} />
              <AppointmentStatus status={view.appointment.status} theme="admin" />
              <AppointmentActionButtons
                appointment={view.appointment}
                role={role}
                busy={statusAction.pendingId === view.appointment.id}
                onAction={handleAction}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default MyAppointmentsPage;
