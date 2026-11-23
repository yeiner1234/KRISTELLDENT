import { CalendarCheck, Clock, Users } from 'lucide-react';
import StatCard from '../../components/common/StatCard';
import SectionTitle from '../../components/common/SectionTitle';
import AppointmentStatus from '../../components/appointments/AppointmentStatus';
import EmptyState from '../../components/common/EmptyState';
import Spinner from '../../components/common/Spinner';
import AppointmentActionButtons from '../../components/appointments/AppointmentActionButtons';
import BranchTag from '../../components/appointments/BranchTag';
import { useAuth } from '../../hooks/useAuth';
import { useMyAppointments } from '../../hooks/useAppointments';
import { useAppointmentStatusAction } from '../../hooks/useAppointmentStatusAction';
import { ACTION_TARGET_STATUS, type AppointmentAction } from '../../utils/appointmentActions';
import type { Appointment } from '../../types/Appointment';
import { useAllPatients } from '../../hooks/usePatients';
import { formatFullName } from '../../utils/format';
import { getTodayIsoDate } from '../../utils/date';
import { filterByPanelBranch } from '../../utils/panelBranch';
import { usePanelBranch } from '../../hooks/usePanelBranch';

function minutesBetween(startTime: string, endTime: string): number {
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);
  return endHour * 60 + endMinute - (startHour * 60 + startMinute);
}

function formatHours(totalMinutes: number): string {
  return (totalMinutes / 60).toFixed(1).replace('.', ',');
}

const statusBarClasses: Record<string, string> = {
  confirmed: 'bg-adm-status-confirmed-solid',
  pending: 'bg-adm-status-pending-solid',
  in_room: 'bg-adm-status-in-room-solid',
  cancelled: 'bg-adm-status-cancelled-solid',
  completed: 'bg-adm-status-completed-solid',
};

function DashboardPage() {
  const { user } = useAuth();
  const role = user?.role ?? 'especialista';
  const { appointments: allAppointments, isLoading: isLoadingAppointments, error: appointmentsError, refetch } =
    useMyAppointments(user?.id);
  // El selector "Sede" del panel filtra también las cifras.
  const { selectedBranchId, branchName } = usePanelBranch();
  const appointments = filterByPanelBranch(allAppointments, selectedBranchId);
  const statusAction = useAppointmentStatusAction(refetch);

  const handleAction = (appointment: Appointment, action: AppointmentAction) => {
    if (action !== 'reschedule') {
      void statusAction.run(appointment, ACTION_TARGET_STATUS[action]);
    }
  };
  const { patients, isLoading: isLoadingPatients, error: patientsError } = useAllPatients();
  const isLoading = isLoadingAppointments || isLoadingPatients;
  const loadError = appointmentsError ?? patientsError;

  const patientName = (patientId: string): string => {
    const patient = patients.find((item) => item.id === patientId);
    return patient ? formatFullName(patient.firstName, patient.lastName) : 'Paciente';
  };

  const today = getTodayIsoDate();
  const todayAppointments = appointments
    .filter((appointment) => appointment.date === today)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
  const nextAppointment = todayAppointments.find((appointment) => appointment.status !== 'cancelled');

  const attendedPatients = new Set(
    appointments.filter((appointment) => appointment.status === 'completed').map((appointment) => appointment.patientId),
  ).size;

  const scheduledMinutesToday = todayAppointments
    .filter((appointment) => appointment.status !== 'cancelled')
    .reduce((total, appointment) => total + minutesBetween(appointment.startTime, appointment.endTime), 0);

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size={30} />
      </div>
    );
  }

  if (loadError) {
    return <EmptyState icon={CalendarCheck} title="No se pudo cargar tu panel" description={loadError} />;
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Citas de hoy" value={todayAppointments.length} icon={CalendarCheck} />
        <StatCard label="Pacientes atendidos" value={attendedPatients} icon={Users} />
        <StatCard label="Horas agendadas" value={formatHours(scheduledMinutesToday)} icon={Clock} />
      </div>

      {nextAppointment && (
        <div className="flex flex-col gap-1 rounded-[14px] bg-brand-600 p-[18px_20px] text-white">
          <span className="text-sm" style={{ color: 'rgba(255,255,255,0.82)' }}>
            Próxima cita
          </span>
          <span className="text-[19px] font-semibold tracking-[-0.01em]">{patientName(nextAppointment.patientId)}</span>
          <span className="text-sm" style={{ color: 'rgba(255,255,255,0.86)' }}>
            {nextAppointment.startTime} · {nextAppointment.reason || 'Consulta'} · {branchName(nextAppointment.branchId)}
          </span>
        </div>
      )}

      <div>
        <SectionTitle title="Agenda de hoy" align="left" />
        {statusAction.error && (
          <p
            role="alert"
            className="mt-4 rounded-[10px] border border-adm-status-cancelled-border bg-adm-status-cancelled-bg px-3.5 py-2.5 text-sm font-medium text-adm-danger-text"
          >
            {statusAction.error}
          </p>
        )}
        <div className="mt-4 rounded-[14px] border border-adm-line-card bg-white">
          {todayAppointments.length === 0 ? (
            <div className="p-6">
              <EmptyState title="Sin citas hoy" description="No tienes citas programadas para el día de hoy." />
            </div>
          ) : (
            todayAppointments.map((appointment) => (
              <div
                key={appointment.id}
                className="flex flex-wrap items-center gap-4 border-t border-adm-line-div p-[14px_20px] first:border-t-0"
              >
                <span className="w-[52px] text-sm font-semibold text-adm-ink-700 [font-variant-numeric:tabular-nums]">
                  {appointment.startTime}
                </span>
                <span className={`h-[34px] w-1 rounded-[3px] ${statusBarClasses[appointment.status]}`} />
                <div className="flex min-w-[140px] flex-1 flex-col">
                  <span className="text-sm font-medium text-adm-ink-700">{patientName(appointment.patientId)}</span>
                  <span className="text-[13px] text-adm-ink-400">{appointment.reason || 'Consulta'}</span>
                </div>
                <BranchTag branchId={appointment.branchId} />
                <AppointmentStatus status={appointment.status} theme="admin" />
                <AppointmentActionButtons
                  appointment={appointment}
                  role={role}
                  busy={statusAction.pendingId === appointment.id}
                  onAction={handleAction}
                />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
