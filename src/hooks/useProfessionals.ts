import { useEffect, useState } from 'react';
import type { Professional } from '../types/Professional';
import type { Specialty } from '../types/Specialty';
import { getProfessionals } from '../services/professionalService';
import { getSpecialties } from '../services/specialtyService';

interface UseProfessionalsResult {
  professionals: Professional[];
  isLoading: boolean;
  error: string | null;
}

export function useProfessionals(): UseProfessionalsResult {
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    getProfessionals()
      .then((data) => {
        if (isMounted) {
          setProfessionals(data);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setError('No se pudieron cargar los profesionales.');
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return { professionals, isLoading, error };
}

interface UseSpecialtiesResult {
  specialties: Specialty[];
  isLoading: boolean;
  error: string | null;
}

export function useSpecialties(): UseSpecialtiesResult {
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    getSpecialties()
      .then((data) => {
        if (isMounted) {
          setSpecialties(data);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setError('No se pudieron cargar las especialidades.');
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return { specialties, isLoading, error };
}
