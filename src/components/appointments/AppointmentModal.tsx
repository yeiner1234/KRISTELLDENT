import type { ReactNode } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import AppointmentStatus from './AppointmentStatus';
import AppointmentActionButtons from './AppointmentActionButtons';
import type { Appointment } from '../../types/Appointment';
import type { AppRole } from '../../types/User';
import type { AppointmentAction } from '../../utils/appointmentActions';
import { formatDateLong, formatTimeRange } from '../../utils/date';

interface AppointmentModalProps {
  appointment: Appointment | null;
  role: AppRole;
  professionalName?: string;
  patientLabel?: string;
  onClose: () => void;
  onAction: (appointment: Appointment, action: AppointmentAction) => void;
  busy?: boolean;
  error?: string | null;
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-adm-line-faint py-3">
      <span className="text-[13px] text-adm-ink-300">{label}</span>
      <span className="text-right text-sm font-medium text-adm-ink-700">{value}</span>
    </div>
  );
}

function AppointmentModal({
  appointment,
  role,
  professionalName,
  patientLabel,
  onClose,
  onAction,
  busy,
  error,
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
            <AppointmentActionButtons appointment={appointment} role={role} busy={busy} onAction={onAction} size="sm" />
          </>
        )
      }
    >
      {appointment && (
        <div className="flex flex-col">
          {error && (
            <p
              role="alert"
              className="mb-2 rounded-[10px] border border-adm-status-cancelled-border bg-adm-status-cancelled-bg px-3.5 py-2.5 text-sm font-medium text-adm-danger-text"
            >
              {error}
            </p>
          )}
          <Row label="Estado" value={<AppointmentStatus status={appointment.status} theme="admin" />} />
          <Row label="Código" value={appointment.code} />
          {patientLabel && <Row label="Paciente" value={patientLabel} />}
          <Row label="Profesional" value={professionalName || '—'} />
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
