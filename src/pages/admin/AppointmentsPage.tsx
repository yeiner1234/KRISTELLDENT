import { useMemo, useState } from 'react';
import { CalendarX2, Eye, Plus } from 'lucide-react';
import SectionTitle from '../../components/common/SectionTitle';
import DataTable, { type DataTableColumn } from '../../components/common/DataTable';
import EmptyState from '../../components/common/EmptyState';
import SearchInput from '../../components/common/SearchInput';
import Button from '../../components/common/Button';
import AppointmentModal from '../../components/appointments/AppointmentModal';
import AppointmentStatus from '../../components/appointments/AppointmentStatus';
import NewAppointmentModal from '../../components/appointments/NewAppointmentModal';
import RescheduleAppointmentModal from '../../components/appointments/RescheduleAppointmentModal';
import ProfessionalSelector from '../../components/professionals/ProfessionalSelector';
import Spinner from '../../components/common/Spinner';
import { useAllAppointments } from '../../hooks/useAppointments';
import { useAllPatients } from '../../hooks/usePatients';
import { useProfessionals } from '../../hooks/useProfessionals';
import { useAdminBranches } from '../../hooks/useAdminBranches';
import { useServices } from '../../hooks/useServices';
import { setAppointmentStatus } from '../../services/appointmentService';
import { formatDateLong, formatTimeRange } from '../../utils/date';
import type { Appointment } from '../../types/Appointment';

function AppointmentsPage() {
  const { appointments, isLoading: isLoadingAppointments, refetch } = useAllAppointments();
  const { patients } = useAllPatients();
  const { professionals, isLoading: isLoadingProfessionals } = useProfessionals();
  const { branches } = useAdminBranches();
  const { services } = useServices();
  const [professionalId, setProfessionalId] = useState('');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Appointment | null>(null);
  const [rescheduling, setRescheduling] = useState<Appointment | null>(null);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const isLoading = isLoadingAppointments || isLoadingProfessionals;

  const handleCancel = async (appointment: Appointment) => {
    setIsCancelling(true);
    try {
      await setAppointmentStatus(appointment.id, 'cancelled');
      setSelected(null);
      refetch();
    } finally {
      setIsCancelling(false);
    }
  };

  const handleConfirm = async (appointment: Appointment) => {
    setIsConfirming(true);
    try {
      await setAppointmentStatus(appointment.id, 'confirmed');
      setSelected(null);
      refetch();
    } finally {
      setIsConfirming(false);
    }
  };

  const handleReschedule = (appointment: Appointment) => {
    setSelected(null);
    setRescheduling(appointment);
  };

  const professionalName = (id: string) => {
    const professional = professionals.find((item) => item.id === id);
    return professional?.fullName ?? '—';
  };

  const rescheduledService = services.find((item) => item.id === rescheduling?.serviceId);

  const filteredAppointments = useMemo(() => {
    const term = query.trim().toLowerCase();
    return appointments
      .filter((appointment) => (professionalId ? appointment.professionalId === professionalId : true))
      .filter((appointment) => (term ? professionalName(appointment.professionalId).toLowerCase().includes(term) : true));
  }, [professionalId, query, appointments, professionalName]);

  const columns: DataTableColumn<Appointment>[] = [
    { key: 'professional', header: 'Profesional', render: (row) => professionalName(row.professionalId) },
    { key: 'date', header: 'Fecha', render: (row) => <span className="capitalize">{formatDateLong(row.date)}</span> },
    { key: 'time', header: 'Hora', render: (row) => formatTimeRange(row.startTime, row.endTime) },
    { key: 'status', header: 'Estado', render: (row) => <AppointmentStatus status={row.status} theme="admin" /> },
    {
      key: 'actions',
      header: '',
      render: (row) => (
        <button
          type="button"
          onClick={() => setSelected(row)}
          aria-label="Ver detalle de la cita"
          className="rounded-[7px] border border-adm-line-control p-1.5 text-adm-ink-400 transition-colors hover:bg-adm-surface-hover"
        >
          <Eye size={16} />
        </button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <SectionTitle title="Citas" align="left" />

      <div className="flex flex-wrap items-center gap-2.5 rounded-[14px] border border-adm-line-card bg-white p-4">
        <SearchInput
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar por profesional..."
          wrapperClassName="min-w-[180px] flex-1"
        />
        <div className="w-full max-w-[220px]">
          <ProfessionalSelector professionals={professionals} value={professionalId} onChange={setProfessionalId} hideLabel />
        </div>
        <Button type="button" variant="admin-solid" size="sm" icon={<Plus size={16} />} onClick={() => setIsNewModalOpen(true)}>
          Nueva cita
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Spinner size={28} />
        </div>
      ) : filteredAppointments.length === 0 ? (
        <EmptyState
          icon={CalendarX2}
          title="Sin citas para mostrar"
          description="Las citas reservadas por los pacientes aparecerán en esta lista."
        />
      ) : (
        <DataTable columns={columns} rows={filteredAppointments} getRowId={(row) => row.id} />
      )}

      <AppointmentModal
        appointment={selected}
        professionalName={selected ? professionalName(selected.professionalId) : undefined}
        onClose={() => setSelected(null)}
        onCancel={handleCancel}
        onConfirm={handleConfirm}
        onReschedule={handleReschedule}
        isCancelling={isCancelling}
        isConfirming={isConfirming}
      />

      <RescheduleAppointmentModal
        appointment={rescheduling}
        service={rescheduledService}
        onClose={() => setRescheduling(null)}
        onRescheduled={refetch}
      />

      <NewAppointmentModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        onCreated={refetch}
        branches={branches}
        professionals={professionals}
        services={services}
        patients={patients}
      />
    </div>
  );
}

export default AppointmentsPage;
