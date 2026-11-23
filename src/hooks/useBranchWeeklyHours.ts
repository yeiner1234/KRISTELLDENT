import { useEffect, useState } from 'react';
import { getBranchWeeklyHours } from '../services/branchScheduleService';
import type { WeeklyHours } from '../utils/businessHours';

interface UseBranchWeeklyHoursResult {
  hours: WeeklyHours;
  isLoading: boolean;
  error: string | null;
}

interface LoadedHours {
  branchId: string;
  hours: WeeklyHours;
  error: string | null;
}

// Horario semanal de una sede (branch_schedules). '' = aún sin sede elegida.
// Mientras el resultado guardado sea de otra sede, está cargando.
export function useBranchWeeklyHours(branchId: string): UseBranchWeeklyHoursResult {
  const [loaded, setLoaded] = useState<LoadedHours | null>(null);

  useEffect(() => {
    if (!branchId) {
      return;
    }
    let isMounted = true;

    getBranchWeeklyHours(branchId)
      .then((hours) => {
        if (isMounted) setLoaded({ branchId, hours, error: null });
      })
      .catch(() => {
        if (isMounted) setLoaded({ branchId, hours: {}, error: 'No se pudo cargar el horario de la sede.' });
      });

    return () => {
      isMounted = false;
    };
  }, [branchId]);

  const current = loaded?.branchId === branchId ? loaded : null;
  return {
    hours: current?.hours ?? {},
    isLoading: Boolean(branchId) && !current,
    error: current?.error ?? null,
  };
}
