import { useEffect, useState } from 'react';
import type { Service } from '../types/Service';
import { getServices } from '../services/serviceService';

interface UseServicesResult {
  services: Service[];
  isLoading: boolean;
  error: string | null;
}

export function useServices(): UseServicesResult {
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    getServices()
      .then((data) => {
        if (isMounted) {
          setServices(data);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setError('No se pudieron cargar los servicios.');
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return { services, isLoading, error };
}
