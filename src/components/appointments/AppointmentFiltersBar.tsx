import type { ReactNode } from 'react';
import Input from '../common/Input';
import Select from '../common/Select';
import SearchInput from '../common/SearchInput';
import ProfessionalSelector from '../professionals/ProfessionalSelector';
import { formatAppointmentStatus } from '../../utils/format';
import type { AppointmentFilters } from '../../utils/appointmentViews';
import type { AppointmentStatus } from '../../types/Appointment';
import type { Professional } from '../../types/Professional';

interface AppointmentFiltersBarProps {
  filters: AppointmentFilters;
  onChange: (filters: AppointmentFilters) => void;
  professionals: Professional[];
  // Solo para admin_global: el resto ve únicamente su sede.
  branches?: { id: string; name: string }[];
  showDate?: boolean;
  actions?: ReactNode;
}

const STATUSES: AppointmentStatus[] = ['pending', 'confirmed', 'in_room', 'completed', 'cancelled'];

const statusOptions = [
  { value: '', label: 'Todos los estados' },
  ...STATUSES.map((status) => ({ value: status, label: formatAppointmentStatus(status) })),
];

function AppointmentFiltersBar({
  filters,
  onChange,
  professionals,
  branches,
  showDate = true,
  actions,
}: AppointmentFiltersBarProps) {
  const update = (patch: Partial<AppointmentFilters>) => onChange({ ...filters, ...patch });

  return (
    <div className="flex flex-wrap items-end gap-2.5 rounded-[14px] border border-adm-line-card bg-white p-4">
      {showDate && (
        <div className="w-full sm:w-[170px]">
          <Input
            label="Fecha"
            type="date"
            variant="admin"
            value={filters.date}
            onChange={(event) => update({ date: event.target.value })}
          />
        </div>
      )}
      <div className="w-full sm:w-[210px]">
        <ProfessionalSelector
          professionals={professionals}
          value={filters.professionalId}
          onChange={(professionalId) => update({ professionalId })}
        />
      </div>
      <div className="w-full sm:w-[170px]">
        <Select
          label="Estado"
          options={statusOptions}
          value={filters.status}
          onChange={(event) => update({ status: event.target.value as AppointmentStatus | '' })}
        />
      </div>
      {branches && (
        <div className="w-full sm:w-[190px]">
          <Select
            label="Sede"
            options={[{ value: '', label: 'Todas las sedes' }, ...branches.map((branch) => ({ value: branch.id, label: branch.name }))]}
            value={filters.branchId}
            onChange={(event) => update({ branchId: event.target.value })}
          />
        </div>
      )}
      <SearchInput
        value={filters.query}
        onChange={(event) => update({ query: event.target.value })}
        placeholder="Buscar paciente, DNI, código o profesional..."
        aria-label="Buscar citas"
        wrapperClassName="h-[42px] min-w-[200px] flex-1"
      />
      {actions}
    </div>
  );
}

export default AppointmentFiltersBar;
