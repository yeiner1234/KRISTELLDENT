import { useCallback, useEffect, useState } from 'react';
import type { Appointment } from '../types/Appointment';
import { getAllAppointments, getAppointmentsByPatientDni } from '../services/appointmentService';

export function useAppointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchByDni = useCallback(async (dni: string) => {
    setIsLoading(true);
    const data = await getAppointmentsByPatientDni(dni);
    setAppointments(data);
    setIsLoading(false);
    return data;
  }, []);

  return { appointments, isLoading, fetchByDni };
}

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
