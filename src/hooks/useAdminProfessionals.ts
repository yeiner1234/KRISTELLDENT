import { useCallback, useEffect, useState } from 'react';
import { getAllProfessionalsForAdmin } from '../services/professionalService';
import type { Professional } from '../types/Professional';

interface UseAdminProfessionalsResult {
  professionals: Professional[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useAdminProfessionals(): UseAdminProfessionalsResult {
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setError(null);

    getAllProfessionalsForAdmin()
      .then((data) => {
        if (isMounted) {
          setProfessionals(data);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'No se pudieron cargar los profesionales.');
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [reloadKey]);

  const refetch = useCallback(() => setReloadKey((key) => key + 1), []);

  return { professionals, isLoading, error, refetch };
}
