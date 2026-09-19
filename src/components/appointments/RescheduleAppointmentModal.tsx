import { useState, type FormEvent } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import AdminSlotPicker from './AdminSlotPicker';
import { rescheduleAppointment } from '../../services/appointmentService';
import { addMinutesToTime } from '../../utils/date';
import type { Appointment } from '../../types/Appointment';
import type { Service } from '../../types/Service';

interface RescheduleAppointmentModalProps {
  appointment: Appointment | null;
  service: Service | undefined;
  onClose: () => void;
  onRescheduled: () => void;
}

function RescheduleAppointmentModal({ appointment, service, onClose, onRescheduled }: RescheduleAppointmentModalProps) {
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const duration = service?.duration ?? 30;

  const handleClose = () => {
    setDate(null);
    setTime(null);
    setError(null);
    onClose();
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!appointment || !date || !time) return;

    setError(null);
    setIsSubmitting(true);

    try {
      await rescheduleAppointment(appointment.id, {
        date,
        startTime: time,
        endTime: addMinutesToTime(time, duration),
      });
      handleClose();
      onRescheduled();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo reprogramar la cita.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={appointment !== null} onClose={handleClose} title="Reprogramar cita" maxWidth="max-w-[560px]">
      {appointment && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 py-2">
          <p className="text-sm text-adm-ink-400">
            Cita actual: <span className="font-medium text-adm-ink-700">{appointment.date}</span> a las{' '}
            <span className="font-medium text-adm-ink-700">{appointment.startTime}</span>
          </p>

          {error && (
            <p className="rounded-[10px] border border-adm-status-cancelled-border bg-adm-status-cancelled-bg px-3.5 py-2.5 text-sm font-medium text-adm-danger-text">
              {error}
            </p>
          )}

          <AdminSlotPicker
            professionalId={appointment.professionalId}
            branchId={appointment.branchId}
            serviceId={appointment.serviceId}
            date={date}
            time={time}
            onSelectDate={(value) => {
              setDate(value);
              setTime(null);
            }}
            onSelectTime={setTime}
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="admin-outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit" variant="admin-solid" disabled={!date || !time || isSubmitting}>
              {isSubmitting ? 'Guardando…' : 'Reprogramar'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

export default RescheduleAppointmentModal;
