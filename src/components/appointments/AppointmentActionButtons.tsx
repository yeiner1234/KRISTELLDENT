import Button from '../common/Button';
import { ACTION_LABELS, getAppointmentActions, type AppointmentAction } from '../../utils/appointmentActions';
import type { Appointment } from '../../types/Appointment';
import type { AppRole } from '../../types/User';

interface AppointmentActionButtonsProps {
  appointment: Appointment;
  role: AppRole;
  // true mientras se guarda un cambio de esta cita.
  busy?: boolean;
  onAction: (appointment: Appointment, action: AppointmentAction) => void;
  size?: 'xs' | 'sm';
}

const variantByAction: Record<AppointmentAction, 'admin-solid' | 'admin-outline' | 'admin-danger'> = {
  confirm: 'admin-outline',
  arrive: 'admin-solid',
  complete: 'admin-solid',
  reschedule: 'admin-outline',
  cancel: 'admin-danger',
};

// Solo muestra las acciones que el trigger permite para el estado de la cita
// y que el rol puede hacer.
function AppointmentActionButtons({ appointment, role, busy = false, onAction, size = 'xs' }: AppointmentActionButtonsProps) {
  const actions = getAppointmentActions(appointment.status, role);

  if (actions.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {actions.map((action) => (
        <Button
          key={action}
          type="button"
          variant={variantByAction[action]}
          size={size}
          disabled={busy}
          onClick={() => onAction(appointment, action)}
        >
          {ACTION_LABELS[action]}
        </Button>
      ))}
    </div>
  );
}

export default AppointmentActionButtons;
