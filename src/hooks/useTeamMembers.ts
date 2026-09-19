import { useCallback, useEffect, useState } from 'react';
import { getTeamMembers, type TeamMember } from '../services/teamService';

interface UseTeamMembersResult {
  members: TeamMember[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useTeamMembers(): UseTeamMembersResult {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setError(null);

    getTeamMembers()
      .then((data) => {
        if (isMounted) {
          setMembers(data);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'No se pudo cargar el equipo.');
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [reloadKey]);

  const refetch = useCallback(() => setReloadKey((key) => key + 1), []);

  return { members, isLoading, error, refetch };
}
