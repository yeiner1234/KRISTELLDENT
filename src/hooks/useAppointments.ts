import { useCallback, useEffect, useState } from 'react';
import type { Appointment } from '../types/Appointment';
import { getAllAppointments } from '../services/appointmentService';

interface UseAllAppointmentsResult {
  appointments: Appointment[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useAllAppointments(): UseAllAppointmentsResult {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setError(null);

    getAllAppointments()
      .then((data) => {
        if (isMounted) {
          setAppointments(data);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setError('No se pudieron cargar las citas.');
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [reloadKey]);

  const refetch = useCallback(() => setReloadKey((key) => key + 1), []);

  return { appointments, isLoading, error, refetch };
}
