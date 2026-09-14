import { useState } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import SectionTitle from '../../components/common/SectionTitle';
import BookingSummary from '../../components/booking/BookingSummary';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import { useProfessionals, useSpecialties } from '../../hooks/useProfessionals';
import { createAppointment } from '../../services/appointmentService';
import { formatFullName } from '../../utils/format';
import { addMinutesToTime, formatDateLong } from '../../utils/date';
import type { BookingSelection } from './BookingPage';

type ConfirmBookingState = BookingSelection & { dni: string; email: string };

function ConfirmBookingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as ConfirmBookingState | null;
  const { professionals } = useProfessionals();
  const { specialties } = useSpecialties();
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!state) {
    return <Navigate to="/reservar" replace />;
  }

  const professional = professionals.find((item) => item.id === state.professionalId);
  const specialty = specialties.find((item) => item.id === state.specialtyId);

  const handleConfirm = async () => {
    setIsSubmitting(true);

    await createAppointment({
      patientId: state.dni,
      professionalId: state.professionalId,
      date: state.date,
      startTime: state.time,
      endTime: addMinutesToTime(state.time, 30),
      reason,
    });

    setIsSubmitting(false);
    navigate('/reservar/exito');
  };

  return (
    <section className="mx-auto max-w-lg px-4 py-12 sm:px-6">
      <SectionTitle title="Confirma tu cita" align="left" />

      <div className="mt-8 flex flex-col gap-6">
        <Input
          label="Motivo de la consulta"
          name="reason"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Ej. Dolor de muela, limpieza, revisión"
        />

        <BookingSummary
          patientName={`DNI ${state.dni}`}
          professionalName={professional ? formatFullName(professional.firstName, professional.lastName) : '—'}
          specialtyName={specialty?.name ?? '—'}
          date={formatDateLong(state.date)}
          time={state.time}
          reason={reason}
        />

        <Button onClick={handleConfirm} disabled={isSubmitting} className="w-full">
          {isSubmitting ? 'Confirmando…' : 'Confirmar cita'}
        </Button>
      </div>
    </section>
  );
}

export default ConfirmBookingPage;
