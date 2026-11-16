import { useCallback, useState } from 'react';
import { useAppointmentStatusAction } from './useAppointmentStatusAction';
import { ACTION_TARGET_STATUS, type AppointmentAction } from '../utils/appointmentActions';
import type { Appointment } from '../types/Appointment';

// Estado compartido por las pantallas de citas: cita abierta en el detalle,
// cita que se reprograma y la acción de estado en curso.
export function useAppointmentDetail(onChanged: () => void) {
  const [selected, setSelected] = useState<Appointment | null>(null);
  const [rescheduling, setRescheduling] = useState<Appointment | null>(null);
  const statusAction = useAppointmentStatusAction(onChanged);
  const { run, clearError } = statusAction;

  const open = useCallback(
    (appointment: Appointment) => {
      clearError();
      setSelected(appointment);
    },
    [clearError],
  );

  const close = useCallback(() => setSelected(null), []);
  const closeReschedule = useCallback(() => setRescheduling(null), []);

  const handleAction = useCallback(
    async (appointment: Appointment, action: AppointmentAction) => {
      if (action === 'reschedule') {
        clearError();
        setSelected(null);
        setRescheduling(appointment);
        return;
      }
      if (await run(appointment, ACTION_TARGET_STATUS[action])) {
        setSelected(null);
      }
    },
    [clearError, run],
  );

  return { selected, open, close, rescheduling, closeReschedule, handleAction, statusAction };
}
