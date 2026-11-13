import StatusBadge from '../common/StatusBadge';
import type { AppointmentStatus as AppointmentStatusType } from '../../types/Appointment';
import { formatAppointmentStatus } from '../../utils/format';

interface AppointmentStatusProps {
  status: AppointmentStatusType;
  theme?: 'public' | 'admin';
}

const toneByStatus: Record<AppointmentStatusType, 'success' | 'warning' | 'neutral' | 'danger' | 'brand'> = {
  pending: 'warning',
  confirmed: 'success',
  in_room: 'brand',
  completed: 'neutral',
  cancelled: 'danger',
};

const adminToneByStatus: Record<AppointmentStatusType, 'adm-confirmed' | 'adm-pending' | 'adm-in-room' | 'adm-cancelled' | 'adm-completed'> = {
  pending: 'adm-pending',
  confirmed: 'adm-confirmed',
  in_room: 'adm-in-room',
  completed: 'adm-completed',
  cancelled: 'adm-cancelled',
};

function AppointmentStatus({ status, theme = 'public' }: AppointmentStatusProps) {
  const tone = theme === 'admin' ? adminToneByStatus[status] : toneByStatus[status];
  return <StatusBadge label={formatAppointmentStatus(status)} tone={tone} />;
}

export default AppointmentStatus;
