import Input from '../common/Input';
import Select from '../common/Select';
import { PrintButton, ReportToolbar } from './ReportParts';
import { REPORT_STATUS_OPTIONS, type ReportStatusFilter } from '../../utils/reports/adminData';
import { REPORT_GROUPING_OPTIONS, type ReportGrouping } from '../../utils/reports/period';
import type { AdminReportFiltersState } from '../../hooks/useAdminReportFilters';
import type { AdminReportData } from '../../hooks/useAdminReportData';

// Filtros de los reportes de administración (no se imprimen). La admin de sede
// no elige sede: ve la suya.
function AdminReportToolbar({
  state,
  data,
  doctors,
  fileName,
  showStatus = false,
  showGrouping = false,
}: {
  state: AdminReportFiltersState;
  data: AdminReportData;
  doctors: { id: string; name: string }[];
  // Código del documento: nombre del PDF descargado.
  fileName: string;
  showStatus?: boolean;
  showGrouping?: boolean;
}) {
  const { filters } = state;

  return (
    <ReportToolbar>
      <Input
        label="Desde"
        type="date"
        variant="admin"
        value={filters.from}
        max={filters.to}
        onChange={(event) => event.target.value && event.target.value <= filters.to && state.setFrom(event.target.value)}
      />
      <Input
        label="Hasta"
        type="date"
        variant="admin"
        value={filters.to}
        min={filters.from}
        onChange={(event) => event.target.value && event.target.value >= filters.from && state.setTo(event.target.value)}
      />
      {data.isGlobal && (
        <Select
          label="Sede"
          value={filters.branchId}
          onChange={(event) => state.setBranchId(event.target.value)}
          options={[{ value: '', label: 'Todas' }, ...data.allowedBranches.map((branch) => ({ value: branch.id, label: branch.name }))]}
        />
      )}
      <Select
        label="Doctora"
        value={filters.professionalId}
        onChange={(event) => state.setProfessionalId(event.target.value)}
        options={[{ value: '', label: 'Todas' }, ...doctors.map((doctor) => ({ value: doctor.id, label: doctor.name }))]}
      />
      <Select
        label="Especialidad"
        value={filters.specialtyId}
        onChange={(event) => state.setSpecialtyId(event.target.value)}
        options={[
          { value: '', label: 'Todas' },
          ...[...data.specialties]
            .sort((a, b) => a.name.localeCompare(b.name, 'es'))
            .map((specialty) => ({ value: specialty.id, label: specialty.name })),
        ]}
      />
      {showStatus && (
        <Select
          label="Estado"
          value={filters.status}
          onChange={(event) => state.setStatus(event.target.value as ReportStatusFilter)}
          options={REPORT_STATUS_OPTIONS}
        />
      )}
      {showGrouping && (
        <Select
          label="Agrupación"
          value={state.grouping}
          onChange={(event) => state.setGrouping(event.target.value as ReportGrouping)}
          options={REPORT_GROUPING_OPTIONS}
        />
      )}
      <PrintButton fileName={fileName} />
    </ReportToolbar>
  );
}

export default AdminReportToolbar;
