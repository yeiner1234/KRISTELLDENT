import { useMemo, useState } from 'react';
import { CalendarX2, ClipboardList } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import EmptyState from '../../components/common/EmptyState';
import Spinner from '../../components/common/Spinner';
import AppointmentModal from '../../components/appointments/AppointmentModal';
import AppointmentRow from '../../components/appointments/AppointmentRow';
import AppointmentDayList from '../../components/appointments/AppointmentDayList';
import AppointmentStatusTabs from '../../components/appointments/AppointmentStatusTabs';
import AppointmentFiltersBar from '../../components/appointments/AppointmentFiltersBar';
import { useAuth } from '../../hooks/useAuth';
import { useAllAppointments } from '../../hooks/useAppointments';
import { useAppointmentDetail } from '../../hooks/useAppointmentDetail';
import { useAllPatients } from '../../hooks/usePatients';
import { useProfessionals } from '../../hooks/useProfessionals';
import { useServices } from '../../hooks/useServices';
import { usePanelBranch } from '../../hooks/usePanelBranch';
import { filterByPanelBranch } from '../../utils/panelBranch';
import {
  buildAppointmentViews,
  countAppointmentsByStatus,
  filterAppointmentViews,
  type AppointmentFilters,
} from '../../utils/appointmentViews';
import { formatDateLong, getTodayIsoDate } from '../../utils/date';

// Citas de la sede de la técnica, con los mismos filtros que en el panel
// admin. La RLS solo le devuelve las citas de sus sedes; no puede crear citas.
function BranchAppointmentsPage() {
  const { user } = useAuth();
  const role = user?.role ?? 'tecnica';
  const { appointments, isLoading: isLoadingAppointments, error: appointmentsError, refetch } = useAllAppointments();
  const { patients, isLoading: isLoadingPatients, error: patientsError } = useAllPatients();
  // La técnica no puede leer profiles: los nombres salen de get_public_professionals.
  const { professionals, error: professionalsError } = useProfessionals();
  const { services, error: servicesError } = useServices();
  const { selectedBranchId, branchName } = usePanelBranch();
  const loadError = appointmentsError ?? patientsError ?? professionalsError ?? servicesError;
  const isLoading = isLoadingAppointments || isLoadingPatients;

  const [filters, setFilters] = useState<AppointmentFilters>(() => ({
    date: getTodayIsoDate(),
    professionalId: '',
    status: '',
    branchId: '',
    query: '',
  }));
  const { selected, open: openDetail, close, handleAction, statusAction } = useAppointmentDetail(refetch);

  const views = useMemo(
    () =>
      buildAppointmentViews(filterByPanelBranch(appointments, selectedBranchId), { patients, professionals, services }),
    [appointments, selectedBranchId, patients, professionals, services],
  );
  const filteredViews = useMemo(() => filterAppointmentViews(views, filters), [views, filters]);
  // Las pestañas cuentan con todos los filtros menos el de estado.
  const statusCounts = useMemo(
    () => countAppointmentsByStatus(filterAppointmentViews(views, { ...filters, status: '' })),
    [views, filters],
  );
  const todayIso = getTodayIsoDate();
  const selectedView = views.find((view) => view.appointment.id === selected?.id);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Citas"
        icon={ClipboardList}
        subtitle={
          <>
            {filteredViews.length} {filteredViews.length === 1 ? 'cita' : 'citas'}
            {filters.date && <span className="capitalize"> · {formatDateLong(filters.date)}</span>}
          </>
        }
      />

      <AppointmentFiltersBar filters={filters} onChange={setFilters} showStatus={false} professionals={professionals} />

      <AppointmentStatusTabs
        value={filters.status}
        onChange={(status) => setFilters({ ...filters, status })}
        counts={statusCounts}
      />

      {statusAction.error && !selected && (
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
      ) : filteredViews.length === 0 ? (
        <EmptyState
          icon={CalendarX2}
          title="Sin citas para mostrar"
          description="No hay citas con estos filtros. Cambia la fecha, el profesional o el estado."
        />
      ) : (
        <AppointmentDayList
          views={filteredViews}
          todayIso={todayIso}
          renderRow={(view) => (
            <AppointmentRow
              view={view}
              role={role}
              busy={statusAction.pendingId === view.appointment.id}
              onAction={handleAction}
              onOpen={openDetail}
              branchName={selectedBranchId ? undefined : branchName(view.appointment.branchId)}
            />
          )}
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

export default BranchAppointmentsPage;
