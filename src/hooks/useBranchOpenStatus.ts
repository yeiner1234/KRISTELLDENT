import { useEffect, useState } from 'react';
import { getBranchOpenStatus, type BranchOpenStatus, type WeeklyHours } from '../utils/businessHours';
import { getBranchWeeklyHours } from '../services/branchScheduleService';

const emptyStatus: BranchOpenStatus = { isOpen: false, todayLabel: 'Horario no configurado' };

export function useBranchOpenStatus(branchId: string): BranchOpenStatus {
  const [hours, setHours] = useState<WeeklyHours | null>(null);
  const [status, setStatus] = useState<BranchOpenStatus>(emptyStatus);

  useEffect(() => {
    let isMounted = true;

    getBranchWeeklyHours(branchId).then((data) => {
      if (isMounted) {
        setHours(data);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [branchId]);

  useEffect(() => {
    if (!hours) {
      return;
    }

    setStatus(getBranchOpenStatus(hours));
    const interval = setInterval(() => setStatus(getBranchOpenStatus(hours)), 60_000);
    return () => clearInterval(interval);
  }, [hours]);

  return status;
}
