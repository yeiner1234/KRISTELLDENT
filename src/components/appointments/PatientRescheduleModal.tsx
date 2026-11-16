import { useState } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import FormError from '../common/FormError';
import AdminSlotPicker from './AdminSlotPicker';
import { reschedulePatientAppointment } from '../../services/appointmentService';
import { formatDateLong } from '../../utils/date';
import type { PatientAppointment } from '../../types/Appointment';

interface PatientRescheduleModalProps {
  dni: string;
  code: string;
  appointment: PatientAppointment | null;
  onClose: () => void;
  onRescheduled: () => void;
}

// Mismo profesional, sede y servicio: solo cambian la fecha y la hora. Los
// horarios salen de get_available_slots excluyendo la propia cita, y el
// servidor vuelve a comprobarlos al guardar.
function PatientRescheduleModal({ dni, code, appointment, onClose, onRescheduled }: PatientRescheduleModalProps) {
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleClose = () => {
    if (isSubmitting) return;
    setDate(null);
    setTime(null);
    setError(null);
    onClose();
  };

  const handleConfirm = async () => {
    if (!appointment || !date || !time || isSubmitting) return;

    setError(null);
    setIsSubmitting(true);
    try {
      await reschedulePatientAppointment(dni, code, appointment.id, { date, startTime: time });
      setIsSubmitting(false);
      setDate(null);
      setTime(null);
      onRescheduled();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo reprogramar la cita.');
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={appointment !== null}
      onClose={handleClose}
      title="Reprogramar cita"
      maxWidth="max-w-[600px]"
      footer={
        <>
          <Button type="button" variant="admin-outline" onClick={handleClose} disabled={isSubmitting}>
            Volver
          </Button>
          <Button type="button" variant="admin-solid" onClick={handleConfirm} disabled={!date || !time || isSubmitting}>
            {isSubmitting ? 'Guardando…' : 'Confirmar nuevo horario'}
          </Button>
        </>
      }
    >
      {appointment && (
        <div className="flex flex-col gap-4 py-2">
          <p className="text-sm text-adm-ink-400">
            Cita actual:{' '}
            <span className="font-medium capitalize text-adm-ink-700">{formatDateLong(appointment.date)}</span> a las{' '}
            <span className="font-medium text-adm-ink-700">{appointment.startTime}</span>
            {appointment.professionalName ? ` con ${appointment.professionalName}` : ''}
          </p>

          <FormError message={error} />

          <AdminSlotPicker
            professionalId={appointment.professionalId}
            branchId={appointment.branchId}
            serviceId={appointment.serviceId}
            excludeAppointmentId={appointment.id}
            date={date}
            time={time}
            onSelectDate={(value) => {
              setDate(value);
              setTime(null);
            }}
            onSelectTime={setTime}
          />
        </div>
      )}
    </Modal>
  );
}

export default PatientRescheduleModal;
