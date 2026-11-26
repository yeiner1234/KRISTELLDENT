import { useMemo, useState } from 'react';
import { CalendarRange, CalendarX2 } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import EmptyState from '../../components/common/EmptyState';
import Spinner from '../../components/common/Spinner';
import AgendaGrid from '../../components/dashboard/AgendaGrid';
import AppointmentModal from '../../components/appointments/AppointmentModal';
import AppointmentFiltersBar from '../../components/appointments/AppointmentFiltersBar';
import { useAuth } from '../../hooks/useAuth';
import { useAllAppointments } from '../../hooks/useAppointments';
import { useAppointmentDetail } from '../../hooks/useAppointmentDetail';
import { useAllPatients } from '../../hooks/usePatients';
import { useProfessionals } from '../../hooks/useProfessionals';
import { useServices } from '../../hooks/useServices';
import { usePanelBranch } from '../../hooks/usePanelBranch';
import { filterByPanelBranch } from '../../utils/panelBranch';
import { buildAppointmentViews, filterAppointmentViews, type AppointmentFilters } from '../../utils/appointmentViews';

// Agenda semanal de la sede de la técnica (la RLS solo le devuelve esas citas).
function BranchAgendaPage() {
  const { user } = useAuth();
  const role = user?.role ?? 'tecnica';
  const { appointments, isLoading: isLoadingAppointments, error: appointmentsError, refetch } = useAllAppointments();
  const { patients, isLoading: isLoadingPatients, error: patientsError } = useAllPatients();
  // La técnica no puede leer profiles: los nombres salen de get_public_professionals.
  const { professionals, error: professionalsError } = useProfessionals();
  const { services, error: servicesError } = useServices();
  const { selectedBranchId, branchName } = usePanelBranch();
  const loadError = appointmentsError ?? patientsError ?? professionalsError ?? servicesError;
  // La semana de la grilla hace de filtro de fecha.
  const [filters, setFilters] = useState<AppointmentFilters>({
    date: '',
    professionalId: '',
    status: '',
    branchId: '',
    query: '',
  });
  const { selected, open, close, handleAction, statusAction } = useAppointmentDetail(refetch);
  const isLoading = isLoadingAppointments || isLoadingPatients;

  const views = useMemo(
    () =>
      buildAppointmentViews(filterByPanelBranch(appointments, selectedBranchId), { patients, professionals, services }),
    [appointments, selectedBranchId, patients, professionals, services],
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
      <PageHeader title="Agenda" icon={CalendarRange} subtitle="Las citas de la sede por día y hora." />

      <AppointmentFiltersBar filters={filters} onChange={setFilters} professionals={professionals} showDate={false} />

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
        branchName={selected ? branchName(selected.branchId) : undefined}
        onClose={close}
        onAction={handleAction}
        busy={statusAction.pendingId !== null}
        error={statusAction.error}
      />
    </div>
  );
}

export default BranchAgendaPage;
