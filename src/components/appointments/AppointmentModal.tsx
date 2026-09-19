import type { ReactNode } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import AppointmentStatus from './AppointmentStatus';
import type { Appointment } from '../../types/Appointment';
import { formatDateLong, formatTimeRange } from '../../utils/date';

interface AppointmentModalProps {
  appointment: Appointment | null;
  professionalName?: string;
  onClose: () => void;
  onCancel?: (appointment: Appointment) => void;
  onConfirm?: (appointment: Appointment) => void;
  onReschedule?: (appointment: Appointment) => void;
  isCancelling?: boolean;
  isConfirming?: boolean;
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-adm-line-faint py-3">
      <span className="text-[13px] text-adm-ink-300">{label}</span>
      <span className="text-sm font-medium text-adm-ink-700">{value}</span>
    </div>
  );
}

function AppointmentModal({
  appointment,
  professionalName,
  onClose,
  onCancel,
  onConfirm,
  onReschedule,
  isCancelling,
  isConfirming,
}: AppointmentModalProps) {
  return (
    <Modal
      isOpen={appointment !== null}
      onClose={onClose}
      title="Detalle de la cita"
      footer={
        appointment && (
          <>
            <Button type="button" variant="admin-outline" size="sm" onClick={onClose}>
              Cerrar
            </Button>
            {onReschedule && appointment.status !== 'cancelled' && (
              <Button type="button" variant="admin-outline" size="sm" onClick={() => onReschedule(appointment)}>
                Reprogramar
              </Button>
            )}
            {onConfirm && appointment.status === 'pending' && (
              <Button
                type="button"
                variant="admin-solid"
                size="sm"
                disabled={isConfirming}
                onClick={() => onConfirm(appointment)}
              >
                {isConfirming ? 'Confirmando…' : 'Confirmar cita'}
              </Button>
            )}
            {onCancel && appointment.status !== 'cancelled' && (
              <Button
                type="button"
                variant="admin-danger"
                size="sm"
                disabled={isCancelling}
                onClick={() => onCancel(appointment)}
              >
                {isCancelling ? 'Cancelando…' : 'Cancelar cita'}
              </Button>
            )}
          </>
        )
      }
    >
      {appointment && (
        <div className="flex flex-col">
          <Row label="Estado" value={<AppointmentStatus status={appointment.status} theme="admin" />} />
          <Row label="Profesional" value={professionalName ?? '—'} />
          <Row label="Fecha" value={<span className="capitalize">{formatDateLong(appointment.date)}</span>} />
          <Row label="Hora" value={formatTimeRange(appointment.startTime, appointment.endTime)} />
          {appointment.reason && (
            <div className="py-3">
              <span className="text-[13px] text-adm-ink-300">Motivo</span>
              <p className="mt-1 text-sm text-adm-ink-700">{appointment.reason}</p>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

export default AppointmentModal;
