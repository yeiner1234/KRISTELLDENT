import { useEffect, useState } from 'react';
import type { Branch } from '../types/Branch';
import { getBranches } from '../services/branchService';

interface UseBranchesResult {
  branches: Branch[];
  isLoading: boolean;
  error: string | null;
}

export function useBranches(): UseBranchesResult {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    getBranches()
      .then((data) => {
        if (isMounted) {
          setBranches(data);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setError('No se pudieron cargar las sedes.');
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return { branches, isLoading, error };
}
