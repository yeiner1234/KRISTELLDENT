import { useCallback, useEffect, useState } from 'react';
import { getAllServicesForAdmin } from '../services/serviceService';
import type { Service } from '../types/Service';

interface UseAdminServicesResult {
  services: Service[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useAdminServices(): UseAdminServicesResult {
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setError(null);

    getAllServicesForAdmin()
      .then((data) => {
        if (isMounted) {
          setServices(data);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'No se pudieron cargar los servicios.');
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [reloadKey]);

  const refetch = useCallback(() => setReloadKey((key) => key + 1), []);

  return { services, isLoading, error, refetch };
}
