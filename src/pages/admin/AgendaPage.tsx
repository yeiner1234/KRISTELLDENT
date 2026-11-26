import { useMemo, useState } from 'react';
import { CalendarRange, CalendarX2 } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import EmptyState from '../../components/common/EmptyState';
import Spinner from '../../components/common/Spinner';
import AgendaGrid from '../../components/dashboard/AgendaGrid';
import AppointmentModal from '../../components/appointments/AppointmentModal';
import AppointmentFiltersBar from '../../components/appointments/AppointmentFiltersBar';
import RescheduleAppointmentModal from '../../components/appointments/RescheduleAppointmentModal';
import { useAuth } from '../../hooks/useAuth';
import { useAllAppointments } from '../../hooks/useAppointments';
import { useAppointmentDetail } from '../../hooks/useAppointmentDetail';
import { useAllPatients } from '../../hooks/usePatients';
import { useAdminProfessionals } from '../../hooks/useAdminProfessionals';
import { useAdminServices } from '../../hooks/useAdminServices';
import { useAdminBranches } from '../../hooks/useAdminBranches';
import { buildAppointmentViews, filterAppointmentViews, type AppointmentFilters } from '../../utils/appointmentViews';

function AgendaPage() {
  const { user } = useAuth();
  const role = user?.role ?? 'admin_sede';
  const isAdminGlobal = role === 'admin_global';

  const { appointments, isLoading: isLoadingAppointments, error: appointmentsError, refetch } = useAllAppointments();
  const { patients, isLoading: isLoadingPatients, error: patientsError } = useAllPatients();
  const { professionals, isLoading: isLoadingProfessionals, error: professionalsError } = useAdminProfessionals();
  const { services, error: servicesError } = useAdminServices();
  const { branches, error: branchesError } = useAdminBranches();
  const loadError = appointmentsError ?? patientsError ?? professionalsError ?? servicesError ?? branchesError;
  // La semana de la grilla hace de filtro de fecha.
  const [filters, setFilters] = useState<AppointmentFilters>({
    date: '',
    professionalId: '',
    status: '',
    branchId: '',
    query: '',
  });
  const { selected, open, close, rescheduling, closeReschedule, handleAction, statusAction } = useAppointmentDetail(refetch);
  const isLoading = isLoadingAppointments || isLoadingPatients || isLoadingProfessionals;

  const namedProfessionals = useMemo(() => professionals.filter((professional) => professional.fullName), [professionals]);
  const views = useMemo(
    () => buildAppointmentViews(appointments, { patients, professionals, services }),
    [appointments, patients, professionals, services],
  );
  const filteredViews = useMemo(() => filterAppointmentViews(views, filters), [views, filters]);
  const viewById = useMemo(() => new Map(views.map((view) => [view.appointment.id, view])), [views]);
  const selectedView = selected ? viewById.get(selected.id) : undefined;

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size={30} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Agenda general" icon={CalendarRange} subtitle="Las citas de la semana por día y hora." />

      <AppointmentFiltersBar
        filters={filters}
        onChange={setFilters}
        professionals={namedProfessionals}
        branches={isAdminGlobal ? branches : undefined}
        showDate={false}
      />

      {loadError ? (
        <EmptyState icon={CalendarX2} title="No se pudieron cargar las citas" description={loadError} />
      ) : (
        <AgendaGrid
          appointments={filteredViews.map((view) => view.appointment)}
          resolveTitle={(appointment) => viewById.get(appointment.id)?.patientName ?? 'Paciente'}
          resolveSubtitle={(appointment) => viewById.get(appointment.id)?.professionalName ?? ''}
          onSelect={open}
        />
      )}

      <AppointmentModal
        appointment={selected}
        role={role}
        professionalName={selectedView?.professionalName}
        patientLabel={selectedView ? `${selectedView.patientName} · DNI ${selectedView.patientDni}` : undefined}
        branchName={selected ? branches.find((branch) => branch.id === selected.branchId)?.name : undefined}
        onClose={close}
        onAction={handleAction}
        busy={statusAction.pendingId !== null}
        error={statusAction.error}
      />

      <RescheduleAppointmentModal appointment={rescheduling} onClose={closeReschedule} onRescheduled={refetch} />
    </div>
  );
}

export default AgendaPage;
