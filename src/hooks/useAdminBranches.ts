import { useCallback, useEffect, useState } from 'react';
import { getAllBranches, type BranchRecord } from '../services/adminBranchService';

interface UseAdminBranchesResult {
  branches: BranchRecord[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useAdminBranches(): UseAdminBranchesResult {
  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setError(null);

    getAllBranches()
      .then((data) => {
        if (isMounted) {
          setBranches(data);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'No se pudieron cargar las sedes.');
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [reloadKey]);

  const refetch = useCallback(() => setReloadKey((key) => key + 1), []);

  return { branches, isLoading, error, refetch };
}
