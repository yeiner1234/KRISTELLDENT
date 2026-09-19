import { useState } from 'react';
import { CalendarCheck, Clock, Stethoscope, Users, Eye } from 'lucide-react';
import StatCard from '../../components/common/StatCard';
import SectionTitle from '../../components/common/SectionTitle';
import DataTable, { type DataTableColumn } from '../../components/common/DataTable';
import ActivityChart from '../../components/dashboard/ActivityChart';
import AppointmentStatus from '../../components/appointments/AppointmentStatus';
import AppointmentModal from '../../components/appointments/AppointmentModal';
import RescheduleAppointmentModal from '../../components/appointments/RescheduleAppointmentModal';
import Button from '../../components/common/Button';
import EmptyState from '../../components/common/EmptyState';
import Spinner from '../../components/common/Spinner';
import { useAllAppointments } from '../../hooks/useAppointments';
import { useAllPatients } from '../../hooks/usePatients';
import { useProfessionals } from '../../hooks/useProfessionals';
import { useServices } from '../../hooks/useServices';
import { setAppointmentStatus } from '../../services/appointmentService';
import { formatFullName } from '../../utils/format';
import { getTodayIsoDate } from '../../utils/date';
import type { Appointment } from '../../types/Appointment';
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
  const { appointments, isLoading: isLoadingAppointments, refetch } = useAllAppointments();
  const { patients, isLoading: isLoadingPatients } = useAllPatients();
  const { professionals, isLoading: isLoadingProfessionals } = useProfessionals();
  const { services } = useServices();
  const [selected, setSelected] = useState<Appointment | null>(null);
  const [rescheduling, setRescheduling] = useState<Appointment | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const today = getTodayIsoDate();
  const isLoading = isLoadingAppointments || isLoadingPatients || isLoadingProfessionals;

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

  const rescheduledService = services.find((item) => item.id === rescheduling?.serviceId);

  const todayCount = appointments.filter((appointment) => appointment.date === today).length;
  const pendingCount = appointments.filter((appointment) => appointment.status === 'pending').length;
  const activeProfessionals = professionals.filter((professional) => professional.active).length;

  const upcoming = [...appointments]
    .filter((appointment) => appointment.status !== 'cancelled' && appointment.date >= today)
    .sort((a, b) => (a.date === b.date ? a.startTime.localeCompare(b.startTime) : a.date.localeCompare(b.date)))
    .slice(0, 6);

  const columns: DataTableColumn<Appointment>[] = [
    { key: 'time', header: 'Hora', render: (row) => `${row.startTime}` },
    { key: 'patient', header: 'Paciente', render: (row) => patientName(patients, row.patientId) },
    { key: 'professional', header: 'Profesional', render: (row) => professionalName(professionals, row.professionalId) },
    { key: 'status', header: 'Estado', render: (row) => <AppointmentStatus status={row.status} theme="admin" /> },
    {
      key: 'actions',
      header: '',
      render: (row) => (
        <Button type="button" variant="admin-outline" size="xs" icon={<Eye size={14} />} onClick={() => setSelected(row)}>
          Ver
        </Button>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size={30} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Citas de hoy" value={todayCount} icon={CalendarCheck} />
        <StatCard label="Pacientes registrados" value={patients.length} icon={Users} />
        <StatCard label="Profesionales activos" value={activeProfessionals} icon={Stethoscope} />
        <StatCard label="Citas pendientes" value={pendingCount} icon={Clock} alert={pendingCount > 0} />
      </div>

      <ActivityChart appointments={appointments} />

      <div>
        <div className="mb-4 flex items-center justify-between">
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
          <DataTable columns={columns} rows={upcoming} getRowId={(row) => row.id} pageSize={upcoming.length || 1} />
        )}
      </div>

      <AppointmentModal
        appointment={selected}
        professionalName={selected ? professionalName(professionals, selected.professionalId) : undefined}
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
    </div>
  );
}

export default DashboardPage;
