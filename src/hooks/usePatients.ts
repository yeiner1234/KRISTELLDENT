import { useState } from 'react';
import type { Patient } from '../types/Patient';
import { findPatientByDni } from '../services/patientService';

export function usePatients() {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const lookupByDni = async (dni: string) => {
    setIsLoading(true);
    const result = await findPatientByDni(dni);
    setPatient(result);
    setIsLoading(false);
    return result;
  };

  return { patient, isLoading, lookupByDni };
}
