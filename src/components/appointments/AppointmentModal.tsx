import Modal from '../common/Modal';
import AppointmentStatus from './AppointmentStatus';
import type { Appointment } from '../../types/Appointment';
import { formatDateLong, formatTimeRange } from '../../utils/date';

interface AppointmentModalProps {
  appointment: Appointment | null;
  professionalName?: string;
  onClose: () => void;
}

function AppointmentModal({ appointment, professionalName, onClose }: AppointmentModalProps) {
  return (
    <Modal isOpen={appointment !== null} onClose={onClose} title="Detalle de la cita">
      {appointment && (
        <div className="flex flex-col gap-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-ink-tertiary">Estado</span>
            <AppointmentStatus status={appointment.status} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-ink-tertiary">Profesional</span>
            <span className="font-medium text-brand-900">{professionalName ?? '—'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-ink-tertiary">Fecha</span>
            <span className="font-medium capitalize text-brand-900">{formatDateLong(appointment.date)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-ink-tertiary">Hora</span>
            <span className="font-medium text-brand-900">
              {formatTimeRange(appointment.startTime, appointment.endTime)}
            </span>
          </div>
          {appointment.reason && (
            <div>
              <span className="text-ink-tertiary">Motivo</span>
              <p className="mt-1 text-brand-900">{appointment.reason}</p>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

export default AppointmentModal;
