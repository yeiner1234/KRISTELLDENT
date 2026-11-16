import { useMemo } from 'react';
import { CalendarX2 } from 'lucide-react';
import SectionTitle from '../../components/common/SectionTitle';
import EmptyState from '../../components/common/EmptyState';
import AgendaGrid from '../../components/dashboard/AgendaGrid';
import AppointmentModal from '../../components/appointments/AppointmentModal';
import Spinner from '../../components/common/Spinner';
import { useAuth } from '../../hooks/useAuth';
import { useMyAppointments } from '../../hooks/useAppointments';
import { useAppointmentDetail } from '../../hooks/useAppointmentDetail';
import { useAllPatients } from '../../hooks/usePatients';
import { formatFullName } from '../../utils/format';

function MyAgendaPage() {
  const { user } = useAuth();
  const role = user?.role ?? 'especialista';
  const { appointments, isLoading: isLoadingAppointments, error, refetch } = useMyAppointments(user?.id);
  const { patients, isLoading: isLoadingPatients } = useAllPatients();
  const { selected, open, close, handleAction, statusAction } = useAppointmentDetail(refetch);
  const isLoading = isLoadingAppointments || isLoadingPatients;

  const patientById = useMemo(() => new Map(patients.map((patient) => [patient.id, patient])), [patients]);

  const patientLabel = (patientId: string): string => {
    const patient = patientById.get(patientId);
    return patient ? formatFullName(patient.firstName, patient.lastName) : 'Paciente';
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size={30} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <SectionTitle title="Mi agenda" align="left" />

      {error ? (
        <EmptyState icon={CalendarX2} title="No se pudieron cargar tus citas" description={error} />
      ) : (
        <AgendaGrid
          appointments={appointments}
          resolveTitle={(appointment) => patientLabel(appointment.patientId)}
          resolveSubtitle={(appointment) => appointment.reason}
          onSelect={open}
          headerRight={<span className="text-[13px] text-adm-ink-300">Solo tus citas</span>}
        />
      )}

      <AppointmentModal
        appointment={selected}
        role={role}
        // Las citas de esta pantalla son siempre de la profesional con sesión.
        professionalName={user?.name}
        patientLabel={selected ? patientLabel(selected.patientId) : undefined}
        onClose={close}
        onAction={handleAction}
        busy={statusAction.pendingId !== null}
        error={statusAction.error}
      />
    </div>
  );
}

export default MyAgendaPage;
