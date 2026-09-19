import { useCallback, useEffect, useState } from 'react';
import { getAllSpecialtiesForAdmin } from '../services/specialtyService';
import type { Specialty } from '../types/Specialty';

interface UseAdminSpecialtiesResult {
  specialties: Specialty[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useAdminSpecialties(): UseAdminSpecialtiesResult {
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setError(null);

    getAllSpecialtiesForAdmin()
      .then((data) => {
        if (isMounted) {
          setSpecialties(data);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'No se pudieron cargar las especialidades.');
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [reloadKey]);

  const refetch = useCallback(() => setReloadKey((key) => key + 1), []);

  return { specialties, isLoading, error, refetch };
}
