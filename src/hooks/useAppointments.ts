import { useCallback, useState } from 'react';
import type { Appointment } from '../types/Appointment';
import { getAppointmentsByPatientDni } from '../services/appointmentService';

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
