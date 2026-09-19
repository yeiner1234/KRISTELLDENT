import { useState } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import { CalendarCheck, ClipboardList } from 'lucide-react';
import BookingShell from '../../components/booking/BookingShell';
import StepHeader from '../../components/booking/StepHeader';
import BookingSummary, { type BookingSummaryRow } from '../../components/booking/BookingSummary';
import { useProfessionals, useSpecialties } from '../../hooks/useProfessionals';
import { useBranches } from '../../hooks/useBranches';
import { useServices } from '../../hooks/useServices';
import { createPublicAppointment } from '../../services/appointmentService';
import { formatFullName, formatAppointmentCode } from '../../utils/format';
import { addMinutesToTime, formatDateLong } from '../../utils/date';
import type { BookingSelection } from './BookingPage';
import type { PatientFormValues } from '../../components/booking/PatientForm';

type ConfirmBookingState = BookingSelection & PatientFormValues;

function ConfirmBookingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as ConfirmBookingState | null;
  const { professionals } = useProfessionals();
  const { specialties } = useSpecialties();
  const { branches } = useBranches();
  const { services } = useServices();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!state) {
    return <Navigate to="/reservar" replace />;
  }

  const professional = professionals.find((item) => item.id === state.professionalId);
  const specialty = specialties.find((item) => item.id === state.specialtyId);
  const branch = branches.find((item) => item.id === state.branchId);
  const service = services.find((item) => item.id === state.serviceId);
  const patientName = formatFullName(state.firstName, state.lastName);
  const reason = state.attentionMotiveLabel ?? specialty?.name ?? '';
  const duration = service?.duration ?? 30;

  const handleBack = () => {
    navigate('/reservar/datos', { state });
  };

  const handleConfirm = async () => {
    setError(null);
    setIsSubmitting(true);

    try {
      const appointment = await createPublicAppointment({
        dni: state.dni,
        firstName: state.firstName,
        lastName: state.lastName,
        email: state.email,
        phone: state.phone,
        professionalId: state.professionalId,
        branchId: state.branchId,
        serviceId: state.serviceId,
        date: state.date,
        startTime: state.time,
        endTime: addMinutesToTime(state.time, duration),
        reason,
      });

      navigate('/reservar/exito', {
        state: {
          branchName: branch?.name ?? '—',
          branchRegion: branch?.region ?? '—',
          professionalName: professional?.fullName ?? '—',
          specialtyName: specialty?.name ?? '—',
          serviceName: service ? `${service.name} (${service.duration} min)` : '—',
          date: state.date,
          time: state.time,
          appointmentCode: formatAppointmentCode(appointment.date, appointment.id),
          patientName,
          email: state.email,
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo confirmar la cita.');
      setIsSubmitting(false);
    }
  };

  const rows: BookingSummaryRow[] = [
    { label: 'Sucursal', value: branch?.name ?? '—' },
    { label: 'Especialidad', value: specialty?.name ?? '—' },
    { label: 'Servicio', value: service ? `${service.name} (${service.duration} min)` : '—' },
    { label: 'Profesional', value: professional?.fullName ?? '—' },
    { label: 'Fecha', value: formatDateLong(state.date) },
    { label: 'Hora', value: state.time },
    { label: 'Paciente', value: patientName },
    { label: 'Correo', value: state.email },
  ];

  if (state.attentionMotiveLabel) {
    rows.splice(2, 0, { label: 'Motivo', value: state.attentionMotiveLabel });
  }

  return (
    <BookingShell
      currentStep={7}
      onBack={handleBack}
      onContinue={handleConfirm}
      continueDisabled={isSubmitting}
      continueLabel={isSubmitting ? 'Confirmando…' : 'Confirmar cita'}
      continueIcon={<CalendarCheck size={16} />}
    >
      <StepHeader
        icon={ClipboardList}
        title="Revisa tu cita"
        subtitle="Comprueba que toda la información sea correcta antes de confirmar."
      />
      {error && (
        <p className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {error}
        </p>
      )}
      <BookingSummary rows={rows} />
    </BookingShell>
  );
}

export default ConfirmBookingPage;
