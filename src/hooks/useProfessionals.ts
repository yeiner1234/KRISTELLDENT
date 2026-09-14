import { useEffect, useState } from 'react';
import type { Professional } from '../types/Professional';
import type { Specialty } from '../types/Specialty';
import { getProfessionals } from '../services/professionalService';
import { getSpecialties } from '../services/specialtyService';

export function useProfessionals() {
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    getProfessionals().then((data) => {
      if (isMounted) {
        setProfessionals(data);
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  return { professionals, isLoading };
}

export function useSpecialties() {
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    getSpecialties().then((data) => {
      if (isMounted) {
        setSpecialties(data);
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  return { specialties, isLoading };
}
