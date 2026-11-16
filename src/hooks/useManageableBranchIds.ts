import { useEffect, useState } from 'react';
import { getManageableBranchIds } from '../services/adminBranchService';

interface UseManageableBranchIdsResult {
  // null = todas las sedes (admin_global).
  branchIds: string[] | null;
  isLoading: boolean;
  error: string | null;
}

export function useManageableBranchIds(): UseManageableBranchIdsResult {
  const [branchIds, setBranchIds] = useState<string[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    getManageableBranchIds()
      .then((data) => {
        if (isMounted) {
          setBranchIds(data);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'No se pudieron cargar tus sedes.');
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return { branchIds, isLoading, error };
}
