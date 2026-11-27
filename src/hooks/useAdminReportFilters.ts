import { useMemo, useState } from 'react';
import { getTodayIsoDate } from '../utils/date';
import { defaultReportPeriod, previousPeriod, type ReportGrouping } from '../utils/reports/period';
import type { ReportFilters, ReportStatusFilter } from '../utils/reports/adminData';

// Estado de los filtros de un reporte de administración. `status` fijo para
// los reportes que solo cuentan atendidas (pacientes, desempeño, ingresos).
export function useAdminReportFilters(fixedStatus?: ReportStatusFilter) {
  const today = useMemo(() => getTodayIsoDate(), []);
  const initial = useMemo(() => defaultReportPeriod(today), [today]);
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [branchId, setBranchId] = useState('');
  const [professionalId, setProfessionalId] = useState('');
  const [specialtyId, setSpecialtyId] = useState('');
  const [status, setStatus] = useState<ReportStatusFilter>(fixedStatus ?? 'all');
  const [grouping, setGrouping] = useState<ReportGrouping>('monthly');

  const filters: ReportFilters = { from, to, branchId, professionalId, specialtyId, status: fixedStatus ?? status };
  const previous = previousPeriod(from, to);

  return {
    today,
    filters,
    previous,
    previousFilters: { ...filters, ...previous },
    grouping,
    setFrom,
    setTo,
    // Cambiar de sede limpia la doctora (puede no trabajar en la nueva).
    setBranchId: (value: string) => {
      setBranchId(value);
      setProfessionalId('');
    },
    setProfessionalId,
    setSpecialtyId,
    setStatus,
    setGrouping,
  };
}

export type AdminReportFiltersState = ReturnType<typeof useAdminReportFilters>;
