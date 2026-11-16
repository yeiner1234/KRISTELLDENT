import { useCallback, useState } from 'react';
import { setAppointmentStatus } from '../services/appointmentService';
import type { Appointment, AppointmentStatus } from '../types/Appointment';

interface UseAppointmentStatusActionResult {
  // true si el cambio se guardó.
  run: (appointment: Appointment, status: AppointmentStatus) => Promise<boolean>;
  // Cita que se está guardando: sus botones se deshabilitan.
  pendingId: string | null;
  error: string | null;
  clearError: () => void;
}

// Cambia el estado de una cita y muestra el error del servidor (por ejemplo,
// el del trigger guard_appointment_changes) sin dejar el botón colgado.
export function useAppointmentStatusAction(onDone: () => void): UseAppointmentStatusActionResult {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    async (appointment: Appointment, status: AppointmentStatus) => {
      setPendingId(appointment.id);
      setError(null);
      try {
        await setAppointmentStatus(appointment.id, status);
        onDone();
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudo actualizar la cita.');
        return false;
      } finally {
        setPendingId(null);
      }
    },
    [onDone],
  );

  const clearError = useCallback(() => setError(null), []);

  return { run, pendingId, error, clearError };
}
