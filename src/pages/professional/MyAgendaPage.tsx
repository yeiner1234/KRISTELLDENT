import { useState } from 'react';
import SectionTitle from '../../components/common/SectionTitle';
import AgendaGrid from '../../components/dashboard/AgendaGrid';
import AppointmentModal from '../../components/appointments/AppointmentModal';
import Spinner from '../../components/common/Spinner';
import { useAllAppointments } from '../../hooks/useAppointments';
import { useAllPatients } from '../../hooks/usePatients';
import { setAppointmentStatus } from '../../services/appointmentService';
import { formatFullName } from '../../utils/format';
import type { Appointment } from '../../types/Appointment';

function MyAgendaPage() {
  const { appointments, isLoading: isLoadingAppointments, refetch } = useAllAppointments();
  const { patients, isLoading: isLoadingPatients } = useAllPatients();
  const [selected, setSelected] = useState<Appointment | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const isLoading = isLoadingAppointments || isLoadingPatients;

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

  const patientName = (patientId: string): string => {
    const patient = patients.find((item) => item.id === patientId);
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

      <AgendaGrid
        appointments={appointments}
        resolveTitle={(appointment) => patientName(appointment.patientId)}
        resolveSubtitle={(appointment) => appointment.reason}
        onSelect={setSelected}
        headerRight={<span className="text-[13px] text-adm-ink-300">Solo tus citas</span>}
      />

      <AppointmentModal
        appointment={selected}
        onClose={() => setSelected(null)}
        onCancel={handleCancel}
        onConfirm={handleConfirm}
        isCancelling={isCancelling}
        isConfirming={isConfirming}
      />
    </div>
  );
}

export default MyAgendaPage;
