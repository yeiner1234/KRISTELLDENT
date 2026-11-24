import { useMemo, useState } from 'react';
import { CalendarX2, Eye } from 'lucide-react';
import SectionTitle from '../../components/common/SectionTitle';
import DataTable, { type DataTableColumn } from '../../components/common/DataTable';
import EmptyState from '../../components/common/EmptyState';
import Spinner from '../../components/common/Spinner';
import AppointmentModal from '../../components/appointments/AppointmentModal';
import AppointmentStatus from '../../components/appointments/AppointmentStatus';
import AppointmentActionButtons from '../../components/appointments/AppointmentActionButtons';
import AppointmentFiltersBar from '../../components/appointments/AppointmentFiltersBar';
import BranchTag from '../../components/appointments/BranchTag';
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
  filterAppointmentViews,
  type AppointmentFilters,
  type AppointmentView,
} from '../../utils/appointmentViews';
import { formatDateLong, formatTimeRange, getTodayIsoDate } from '../../utils/date';

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
    // Con "Todas mis sedes" arriba, cada fila dice de qué sede es.
    ...(selectedBranchId
      ? []
      : [
          {
            key: 'branch',
            header: 'Sede',
            render: (row: AppointmentView) => <BranchTag branchId={row.appointment.branchId} />,
          },
        ]),
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

      <AppointmentFiltersBar filters={filters} onChange={setFilters} professionals={professionals} />

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
