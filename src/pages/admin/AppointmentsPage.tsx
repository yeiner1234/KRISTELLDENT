import { useMemo, useState } from 'react';
import { CalendarX2, Eye, Plus } from 'lucide-react';
import SectionTitle from '../../components/common/SectionTitle';
import DataTable, { type DataTableColumn } from '../../components/common/DataTable';
import EmptyState from '../../components/common/EmptyState';
import Button from '../../components/common/Button';
import Spinner from '../../components/common/Spinner';
import AppointmentModal from '../../components/appointments/AppointmentModal';
import AppointmentStatus from '../../components/appointments/AppointmentStatus';
import AppointmentActionButtons from '../../components/appointments/AppointmentActionButtons';
import AppointmentFiltersBar from '../../components/appointments/AppointmentFiltersBar';
import NewAppointmentModal from '../../components/appointments/NewAppointmentModal';
import RescheduleAppointmentModal from '../../components/appointments/RescheduleAppointmentModal';
import { useAuth } from '../../hooks/useAuth';
import { useAllAppointments } from '../../hooks/useAppointments';
import { useAppointmentDetail } from '../../hooks/useAppointmentDetail';
import { useAllPatients } from '../../hooks/usePatients';
import { useAdminProfessionals } from '../../hooks/useAdminProfessionals';
import { useProfessionals } from '../../hooks/useProfessionals';
import { useAdminBranches } from '../../hooks/useAdminBranches';
import { useManageableBranchIds } from '../../hooks/useManageableBranchIds';
import { useAdminServices } from '../../hooks/useAdminServices';
import { useServices } from '../../hooks/useServices';
import {
  buildAppointmentViews,
  filterAppointmentViews,
  type AppointmentFilters,
  type AppointmentView,
} from '../../utils/appointmentViews';
import { formatDateLong, formatTimeRange, getTodayIsoDate } from '../../utils/date';

function AppointmentsPage() {
  const { user } = useAuth();
  const role = user?.role ?? 'admin_sede';
  const isAdminGlobal = role === 'admin_global';

  const { appointments, isLoading: isLoadingAppointments, error: appointmentsError, refetch } = useAllAppointments();
  const { patients, isLoading: isLoadingPatients, error: patientsError } = useAllPatients();
  // Incluye profesionales inactivos: sus citas siguen mostrando su nombre.
  const { professionals, isLoading: isLoadingProfessionals, error: professionalsError } = useAdminProfessionals();
  const { services, error: servicesError } = useAdminServices();
  // La nueva cita solo ofrece profesionales y servicios activos.
  const { professionals: bookableProfessionals, error: bookableProfessionalsError } = useProfessionals();
  const { services: bookableServices, error: bookableServicesError } = useServices();
  const { branches, error: branchesError } = useAdminBranches();
  const { branchIds, error: branchIdsError } = useManageableBranchIds();
  const loadError = appointmentsError ?? patientsError ?? professionalsError ?? servicesError;
  // Sin estos datos la lista se ve, pero "Nueva cita" y el filtro de sede quedan incompletos.
  const catalogError = bookableProfessionalsError ?? bookableServicesError ?? branchesError ?? branchIdsError;

  const [filters, setFilters] = useState<AppointmentFilters>(() => ({
    date: getTodayIsoDate(),
    professionalId: '',
    status: '',
    branchId: '',
    query: '',
  }));
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const { selected, open: openDetail, close, rescheduling, closeReschedule, handleAction, statusAction } =
    useAppointmentDetail(refetch);
  const isLoading = isLoadingAppointments || isLoadingPatients || isLoadingProfessionals;

  const manageableBranches = useMemo(
    () => (branchIds === null ? branches : branches.filter((branch) => branchIds.includes(branch.id))),
    [branches, branchIds],
  );
  const namedProfessionals = useMemo(() => professionals.filter((professional) => professional.fullName), [professionals]);

  const views = useMemo(
    () => buildAppointmentViews(appointments, { patients, professionals, services }),
    [appointments, patients, professionals, services],
  );
  const filteredViews = useMemo(() => filterAppointmentViews(views, filters), [views, filters]);
  const selectedView = views.find((view) => view.appointment.id === selected?.id);

  const columns: DataTableColumn<AppointmentView>[] = [
    ...(filters.date
      ? []
      : [
          {
            key: 'date',
            header: 'Fecha',
            render: (row: AppointmentView) => <span className="capitalize">{formatDateLong(row.appointment.date)}</span>,
          },
        ]),
    {
      key: 'time',
      header: 'Hora',
      render: (row) => (
        <span className="[font-variant-numeric:tabular-nums]">
          {formatTimeRange(row.appointment.startTime, row.appointment.endTime)}
        </span>
      ),
    },
    { key: 'code', header: 'Código', render: (row) => <span className="font-medium">{row.appointment.code}</span> },
    {
      key: 'patient',
      header: 'Paciente',
      render: (row) => (
        <div className="flex flex-col">
          <span>{row.patientName}</span>
          {row.patientDni && <span className="text-xs text-adm-ink-300">DNI {row.patientDni}</span>}
        </div>
      ),
    },
    { key: 'professional', header: 'Profesional', render: (row) => row.professionalName },
    { key: 'service', header: 'Servicio', render: (row) => row.serviceName },
    { key: 'status', header: 'Estado', render: (row) => <AppointmentStatus status={row.appointment.status} theme="admin" /> },
    {
      key: 'actions',
      header: 'Acciones',
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => openDetail(row.appointment)}
            aria-label="Ver detalle de la cita"
            className="rounded-[7px] border border-adm-line-control p-1.5 text-adm-ink-400 transition-colors hover:bg-adm-surface-hover"
          >
            <Eye size={16} />
          </button>
          <AppointmentActionButtons
            appointment={row.appointment}
            role={role}
            busy={statusAction.pendingId === row.appointment.id}
            onAction={handleAction}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionTitle title="Citas" align="left" />
        <span className="text-[13px] text-adm-ink-300">
          {filteredViews.length} {filteredViews.length === 1 ? 'cita' : 'citas'}
          {filters.date && <span className="capitalize"> · {formatDateLong(filters.date)}</span>}
        </span>
      </div>

      <AppointmentFiltersBar
        filters={filters}
        onChange={setFilters}
        professionals={namedProfessionals}
        branches={isAdminGlobal ? branches : undefined}
        actions={
          <Button type="button" variant="admin-solid" size="sm" icon={<Plus size={16} />} onClick={() => setIsNewModalOpen(true)}>
            Nueva cita
          </Button>
        }
      />

      {catalogError && (
        <p
          role="alert"
          className="rounded-[10px] border border-adm-status-cancelled-border bg-adm-status-cancelled-bg px-3.5 py-2.5 text-sm font-medium text-adm-danger-text"
        >
          {catalogError} Recarga la página antes de registrar una cita.
        </p>
      )}

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
        // Las citas del día se ven en una sola pantalla: sin paginar.
        <DataTable
          columns={columns}
          rows={filteredViews}
          getRowId={(row) => row.appointment.id}
          pageSize={Math.max(filteredViews.length, 1)}
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

      <RescheduleAppointmentModal
        appointment={rescheduling}
        onClose={closeReschedule}
        onRescheduled={refetch}
      />

      <NewAppointmentModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        onCreated={refetch}
        branches={manageableBranches}
        professionals={bookableProfessionals}
        services={bookableServices}
        patients={patients}
      />
    </div>
  );
}

export default AppointmentsPage;
