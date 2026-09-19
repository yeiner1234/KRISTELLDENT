import { useEffect, useState } from 'react';
import type { Patient } from '../types/Patient';
import { getAllPatients } from '../services/patientService';

interface UseAllPatientsResult {
  patients: Patient[];
  isLoading: boolean;
  error: string | null;
}

export function useAllPatients(): UseAllPatientsResult {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    getAllPatients()
      .then((data) => {
        if (isMounted) {
          setPatients(data);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setError('No se pudieron cargar los pacientes.');
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return { patients, isLoading, error };
}
