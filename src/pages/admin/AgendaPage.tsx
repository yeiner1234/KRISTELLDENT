import { useMemo, useState } from 'react';
import SectionTitle from '../../components/common/SectionTitle';
import AgendaGrid from '../../components/dashboard/AgendaGrid';
import AppointmentModal from '../../components/appointments/AppointmentModal';
import RescheduleAppointmentModal from '../../components/appointments/RescheduleAppointmentModal';
import ProfessionalSelector from '../../components/professionals/ProfessionalSelector';
import Spinner from '../../components/common/Spinner';
import { useAllAppointments } from '../../hooks/useAppointments';
import { useAllPatients } from '../../hooks/usePatients';
import { useProfessionals } from '../../hooks/useProfessionals';
import { useServices } from '../../hooks/useServices';
import { setAppointmentStatus } from '../../services/appointmentService';
import { formatFullName } from '../../utils/format';
import type { Appointment } from '../../types/Appointment';

function AgendaPage() {
  const { appointments, isLoading: isLoadingAppointments, refetch } = useAllAppointments();
  const { patients, isLoading: isLoadingPatients } = useAllPatients();
  const { professionals, isLoading: isLoadingProfessionals } = useProfessionals();
  const { services } = useServices();
  const [professionalId, setProfessionalId] = useState('');
  const [selected, setSelected] = useState<Appointment | null>(null);
  const [rescheduling, setRescheduling] = useState<Appointment | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
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

  const filteredAppointments = useMemo(
    () =>
      professionalId ? appointments.filter((appointment) => appointment.professionalId === professionalId) : appointments,
    [professionalId, appointments],
  );

  const professionalName = (id: string) => {
    const professional = professionals.find((item) => item.id === id);
    return professional?.fullName;
  };

  const patientName = (id: string) => {
    const patient = patients.find((item) => item.id === id);
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
      <SectionTitle title="Agenda general" align="left" />

      <AgendaGrid
        appointments={filteredAppointments}
        resolveTitle={(appointment) => patientName(appointment.patientId)}
        resolveSubtitle={(appointment) => professionalName(appointment.professionalId) ?? appointment.reason}
        onSelect={setSelected}
        headerRight={
          <div className="w-full max-w-[220px]">
            <ProfessionalSelector professionals={professionals} value={professionalId} onChange={setProfessionalId} hideLabel />
          </div>
        }
      />

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
    </div>
  );
}

export default AgendaPage;
