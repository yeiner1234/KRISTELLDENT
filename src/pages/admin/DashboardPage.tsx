import { CalendarCheck, ChevronRight, Clock, LayoutDashboard, Stethoscope, Users } from 'lucide-react';
import StatCard from '../../components/common/StatCard';
import SectionTitle from '../../components/common/SectionTitle';
import PageHeader from '../../components/common/PageHeader';
import Avatar from '../../components/common/Avatar';
import ActivityChart from '../../components/dashboard/ActivityChart';
import AppointmentStatus from '../../components/appointments/AppointmentStatus';
import AppointmentModal from '../../components/appointments/AppointmentModal';
import RescheduleAppointmentModal from '../../components/appointments/RescheduleAppointmentModal';
import Button from '../../components/common/Button';
import EmptyState from '../../components/common/EmptyState';
import Spinner from '../../components/common/Spinner';
import { useAllAppointments } from '../../hooks/useAppointments';
import { useAllPatients } from '../../hooks/usePatients';
import { useAdminProfessionals } from '../../hooks/useAdminProfessionals';
import { useAdminBranches } from '../../hooks/useAdminBranches';
import { useAuth } from '../../hooks/useAuth';
import { useAppointmentDetail } from '../../hooks/useAppointmentDetail';
import { formatFullName } from '../../utils/format';
import { formatDateLong, getTodayIsoDate } from '../../utils/date';
import { formatRelativeDay } from '../../utils/patientSummary';
import type { Patient } from '../../types/Patient';
import type { Professional } from '../../types/Professional';

function patientName(patients: Patient[], patientId: string): string {
  const patient = patients.find((item) => item.id === patientId);
  return patient ? formatFullName(patient.firstName, patient.lastName) : 'Paciente';
}

function professionalName(professionals: Professional[], professionalId: string): string {
  const professional = professionals.find((item) => item.id === professionalId);
  return professional?.fullName ?? '—';
}

function DashboardPage() {
  const { appointments, isLoading: isLoadingAppointments, error: appointmentsError, refetch } = useAllAppointments();
  const { patients, isLoading: isLoadingPatients, error: patientsError } = useAllPatients();
  const { professionals, isLoading: isLoadingProfessionals, error: professionalsError } = useAdminProfessionals();
  const loadError = appointmentsError ?? patientsError ?? professionalsError;
  // Solo para el nombre de la sede en el detalle de la cita.
  const { branches } = useAdminBranches();
  const { user } = useAuth();
  const { selected, open, close, rescheduling, closeReschedule, handleAction, statusAction } = useAppointmentDetail(refetch);
  const today = getTodayIsoDate();
  const isLoading = isLoadingAppointments || isLoadingPatients || isLoadingProfessionals;

  const todayCount = appointments.filter((appointment) => appointment.date === today).length;
  const pendingCount = appointments.filter((appointment) => appointment.status === 'pending').length;
  const activeProfessionals = professionals.filter((professional) => professional.active).length;

  const upcoming = [...appointments]
    .filter((appointment) => appointment.status !== 'cancelled' && appointment.date >= today)
    .sort((a, b) => (a.date === b.date ? a.startTime.localeCompare(b.startTime) : a.date.localeCompare(b.date)))
    .slice(0, 6);

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size={30} />
      </div>
    );
  }

  if (loadError) {
    return <EmptyState icon={CalendarCheck} title="No se pudo cargar el panel" description={loadError} />;
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={user?.name ? `Hola, ${user.name.split(' ')[0]}` : 'Panel general'}
        icon={LayoutDashboard}
        subtitle={<span className="capitalize">{formatDateLong(today)} · Así va la clínica hoy.</span>}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Citas de hoy" value={todayCount} icon={CalendarCheck} tone="teal" />
        <StatCard label="Pacientes registrados" value={patients.length} icon={Users} tone="pink" />
        <StatCard label="Profesionales activos" value={activeProfessionals} icon={Stethoscope} tone="aqua" />
        <StatCard
          label="Citas pendientes"
          value={pendingCount}
          icon={Clock}
          tone="caramel"
          trend={pendingCount > 0 ? 'Por confirmar' : 'Todo al día'}
        />
      </div>

      <ActivityChart appointments={appointments} />

      <div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <SectionTitle title="Próximas citas" align="left" />
          <Button to="/admin/citas" variant="admin-outline" size="sm">
            Ver todas
          </Button>
        </div>
        {upcoming.length === 0 ? (
          <EmptyState
            icon={CalendarCheck}
            title="No hay citas registradas"
            description="Las próximas citas aparecerán aquí cuando se registren reservas."
          />
        ) : (
          <ul className="flex flex-col gap-2.5" aria-label="Próximas citas">
            {upcoming.map((appointment) => {
              const name = patientName(patients, appointment.patientId);
              return (
                <li key={appointment.id}>
                  <button
                    type="button"
                    onClick={() => open(appointment)}
                    aria-label={`Ver cita de ${name}`}
                    className="group flex w-full flex-wrap items-center gap-x-4 gap-y-3 rounded-[14px] border border-adm-line-card bg-white p-3.5 text-left shadow-soft transition-all hover:border-adm-accent-line hover:shadow-adm-elev-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-adm-accent-ring sm:flex-nowrap sm:px-5"
                  >
                    <span
                      className={`flex w-[84px] shrink-0 flex-col items-center rounded-xl px-2 py-1.5 text-center text-white ${
                        appointment.date === today
                          ? 'bg-gradient-to-br from-kd-pink-500 to-kd-pink-300 shadow-[0_6px_14px_rgba(224,56,127,0.25)]'
                          : 'bg-gradient-to-br from-brand-600 to-kd-aqua-500 shadow-[0_6px_14px_rgba(15,123,134,0.22)]'
                      }`}
                    >
                      <span className="text-[11px] font-semibold uppercase tracking-[0.05em]">
                        {formatRelativeDay(appointment.date, today)}
                      </span>
                      <span className="text-base font-semibold [font-variant-numeric:tabular-nums]">{appointment.startTime}</span>
                    </span>
                    <span className="flex min-w-0 flex-1 items-center gap-3">
                      <Avatar name={name} path={null} className="hidden h-9 w-9 text-xs sm:flex" />
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate text-[15px] font-semibold text-adm-ink-700">{name}</span>
                        <span className="truncate text-[13px] text-adm-ink-400">
                          {professionalName(professionals, appointment.professionalId)}
                        </span>
                      </span>
                    </span>
                    <span className="flex items-center gap-3">
                      <AppointmentStatus status={appointment.status} theme="admin" />
                      <ChevronRight
                        size={18}
                        aria-hidden="true"
                        className="shrink-0 text-adm-ink-100 transition-transform group-hover:translate-x-0.5 group-hover:text-adm-accent-deep"
                      />
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <AppointmentModal
        appointment={selected}
        professionalName={selected ? professionalName(professionals, selected.professionalId) : undefined}
        role={user?.role ?? 'admin_sede'}
        patientLabel={selected ? patientName(patients, selected.patientId) : undefined}
        branchName={selected ? branches.find((branch) => branch.id === selected.branchId)?.name : undefined}
        onClose={close}
        onAction={handleAction}
        busy={statusAction.pendingId !== null}
        error={statusAction.error}
      />

      <RescheduleAppointmentModal
        appointment={rescheduling}
        onClose={closeReschedule}
        onRescheduled={refetch}
      />
    </div>
  );
}

export default DashboardPage;
