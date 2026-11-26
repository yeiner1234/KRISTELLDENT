import { useEffect, useMemo, useState } from 'react';
import { getAppointmentIndicators, type IndicatorFilters } from '../services/indicatorService';
import { summarizeIndicators, type IndicatorRow, type IndicatorSummary } from '../utils/appointmentIndicators';

interface UseAppointmentIndicatorsResult {
  summary: IndicatorSummary;
  isLoading: boolean;
  error: string | null;
}

// HU16: indicadores del periodo; se vuelven a pedir al cambiar un filtro.
export function useAppointmentIndicators(filters: IndicatorFilters): UseAppointmentIndicatorsResult {
  const { from, to, professionalId, branchId } = filters;
  const [rows, setRows] = useState<IndicatorRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setError(null);

    getAppointmentIndicators({ from, to, professionalId, branchId })
      .then((data) => {
        if (isMounted) {
          setRows(data);
          setIsLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'No se pudieron cargar los indicadores.');
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [from, to, professionalId, branchId]);

  const summary = useMemo(() => summarizeIndicators(rows), [rows]);

  return { summary, isLoading, error };
}
