import { useId, useState, type ReactNode } from 'react';
import { SlidersHorizontal } from 'lucide-react';
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

// En celular: buscador y botón "Filtros" arriba; los campos se despliegan
// debajo. Desde md, md:contents y md:order-none dejan la fila de siempre.
function AppointmentFiltersBar({
  filters,
  onChange,
  professionals,
  branches,
  showDate = true,
  actions,
}: AppointmentFiltersBarProps) {
  const update = (patch: Partial<AppointmentFilters>) => onChange({ ...filters, ...patch });
  const [showFilters, setShowFilters] = useState(false);
  const fieldsId = useId();
  const activeCount = [filters.professionalId, filters.status, branches ? filters.branchId : ''].filter(Boolean).length;

  return (
    <div className="flex flex-wrap items-end gap-2.5 rounded-[14px] border border-adm-line-card bg-white p-4">
      <button
        type="button"
        onClick={() => setShowFilters((open) => !open)}
        aria-expanded={showFilters}
        aria-controls={fieldsId}
        className="order-2 flex h-11 shrink-0 items-center gap-2 rounded-[10px] border border-adm-line-control bg-white px-3.5 text-sm font-medium text-adm-ink-700 transition-colors hover:bg-adm-surface-hover md:hidden"
      >
        <SlidersHorizontal size={16} />
        Filtros
        {activeCount > 0 && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-600 px-1.5 text-xs font-semibold text-white">
            {activeCount}
          </span>
        )}
      </button>

      <div
        id={fieldsId}
        data-testid="filters-fields"
        className={`${showFilters ? 'flex' : 'hidden'} order-3 w-full flex-wrap gap-2.5 md:contents`}
      >
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
      </div>
      <SearchInput
        value={filters.query}
        onChange={(event) => update({ query: event.target.value })}
        placeholder="Buscar paciente, DNI, código o profesional..."
        aria-label="Buscar citas"
        wrapperClassName="order-1 h-[42px] min-w-0 flex-1 md:order-none md:min-w-[200px]"
      />
      {actions && <div className="order-4 w-full md:contents [&>*]:w-full md:[&>*]:w-auto">{actions}</div>}
    </div>
  );
}

export default AppointmentFiltersBar;
