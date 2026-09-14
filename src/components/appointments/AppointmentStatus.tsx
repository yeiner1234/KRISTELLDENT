import StatusBadge from '../common/StatusBadge';
import type { AppointmentStatus as AppointmentStatusType } from '../../types/Appointment';
import { formatAppointmentStatus } from '../../utils/format';

interface AppointmentStatusProps {
  status: AppointmentStatusType;
}

const toneByStatus: Record<AppointmentStatusType, 'success' | 'warning' | 'neutral' | 'danger'> = {
  pending: 'warning',
  confirmed: 'success',
  completed: 'neutral',
  cancelled: 'danger',
};

function AppointmentStatus({ status }: AppointmentStatusProps) {
  return <StatusBadge label={formatAppointmentStatus(status)} tone={toneByStatus[status]} />;
}

export default AppointmentStatus;
