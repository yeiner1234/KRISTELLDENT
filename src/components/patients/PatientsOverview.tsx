import { useMemo, useState, type ReactNode } from 'react';
import { CalendarCheck, Clock, Moon, Sparkles, Users, type LucideIcon } from 'lucide-react';
import SectionTitle from '../common/SectionTitle';
import SearchInput from '../common/SearchInput';
import Select from '../common/Select';
import EmptyState from '../common/EmptyState';
import Spinner from '../common/Spinner';
import PatientSummaryRow from './PatientSummaryRow';
import PatientDetailModal from './PatientDetailModal';
import type { Appointment } from '../../types/Appointment';
import type { Patient } from '../../types/Patient';
import type { Professional } from '../../types/Professional';
import type { Service } from '../../types/Service';
import { getTodayIsoDate } from '../../utils/date';
import {
  buildPatientSummaries,
  countPatientFilters,
  filterPatientSummaries,
  sortPatientSummaries,
  type PatientFilter,
  type PatientSort,
} from '../../utils/patientSummary';

const filterTabs: { value: PatientFilter; label: string; icon: LucideIcon; active: string }[] = [
  { value: 'all', label: 'Todos', icon: Users, active: 'border-adm-accent-deep bg-adm-accent-deep text-white' },
  {
    value: 'today',
    label: 'Con cita hoy',
    icon: CalendarCheck,
    active: 'border-adm-status-confirmed-solid bg-adm-status-confirmed-solid text-white',
  },
  {
    value: 'unconfirmed',
    label: 'Por confirmar',
    icon: Clock,
    active: 'border-adm-status-pending-solid bg-adm-status-pending-solid text-white',
  },
  {
    value: 'new',
    label: 'Nuevos',
    icon: Sparkles,
    active: 'border-adm-status-in-room-solid bg-adm-status-in-room-solid text-white',
  },
  {
    value: 'inactive',
    label: 'Inactivos',
    icon: Moon,
    active: 'border-adm-status-completed-solid bg-adm-status-completed-solid text-white',
  },
];

const sortOptions: { value: PatientSort; label: string }[] = [
  { value: 'next', label: 'Próxima cita' },
  { value: 'lastVisit', label: 'Última visita' },
  { value: 'name', label: 'Nombre (A-Z)' },
];

const emptyMessages: Record<Exclude<PatientFilter, 'all'>, string> = {
  today: 'Ningún paciente tiene cita hoy.',
  unconfirmed: 'No hay citas pendientes de confirmar.',
  new: 'No hay pacientes nuevos.',
  inactive: 'Ningún paciente lleva más de 6 meses sin venir.',
};

interface PatientsOverviewProps {
  title: string;
  // Ya recortados a lo que la pantalla debe mostrar (sede, profesional...).
  patients: Patient[];
  appointments: Appointment[];
  professionals: Professional[];
  services: Service[];
  branchName: (branchId: string) => string;
  isLoading: boolean;
  error: string | null;
  // Mensaje cuando no hay ningún paciente (filtro "Todos" sin búsqueda).
  emptyDescription: string;
  headerAction?: ReactNode;
}

// Lista de pacientes con el resumen de sus citas (próxima, última visita,
// historial y alertas), filtros con contador y ficha al hacer clic. La usan
// el panel admin, la técnica y los profesionales.
function PatientsOverview({
  title,
  patients,
  appointments,
  professionals,
  services,
  branchName,
  isLoading,
  error,
  emptyDescription,
  headerAction,
}: PatientsOverviewProps) {
  const todayIso = getTodayIsoDate();
  const summaries = useMemo(
    () => buildPatientSummaries(patients, appointments, { professionals, services }, todayIso),
    [patients, appointments, professionals, services, todayIso],
  );
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<PatientFilter>('all');
  const [sort, setSort] = useState<PatientSort>('next');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const counts = useMemo(() => countPatientFilters(summaries), [summaries]);
  const visibleSummaries = useMemo(
    () => sortPatientSummaries(filterPatientSummaries(summaries, filter, query), sort),
    [summaries, filter, query, sort],
  );
  const selected = summaries.find((summary) => summary.patient.id === selectedId) ?? null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <SectionTitle title={title} align="left" />
        <div className="flex items-center gap-3">
          <span className="text-[13px] text-adm-ink-300">
            {visibleSummaries.length === summaries.length
              ? `${summaries.length} ${summaries.length === 1 ? 'paciente' : 'pacientes'}`
              : `${visibleSummaries.length} de ${summaries.length} pacientes`}
          </span>
          {headerAction}
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-[14px] border border-adm-line-card bg-white p-4">
        <div
          role="tablist"
          aria-label="Filtrar pacientes"
          className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none]"
        >
          {filterTabs.map(({ value, label, icon: Icon, active }) => {
            const isActive = filter === value;
            return (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setFilter(value)}
                className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? active
                    : 'border-adm-line-control bg-white text-adm-ink-500 hover:border-adm-accent-line hover:bg-adm-surface-sel'
                }`}
              >
                <Icon size={15} aria-hidden="true" />
                {label}
                <span
                  className={`min-w-6 rounded-full px-1.5 text-center text-xs font-semibold [font-variant-numeric:tabular-nums] ${
                    isActive ? 'bg-white/25' : 'bg-adm-line-div text-adm-ink-400'
                  }`}
                >
                  {counts[value]}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
          <SearchInput
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por nombre o DNI..."
            aria-label="Buscar pacientes"
            wrapperClassName="min-w-[180px] flex-1"
          />
          <div className="sm:w-52">
            <Select
              label="Ordenar por"
              hideLabel
              value={sort}
              onChange={(event) => setSort(event.target.value as PatientSort)}
              options={sortOptions.map((option) => ({ value: option.value, label: `Ordenar: ${option.label}` }))}
              className="w-full"
            />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Spinner size={28} />
        </div>
      ) : error ? (
        <EmptyState icon={Users} title="No se pudieron cargar los pacientes" description={error} />
      ) : visibleSummaries.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Sin pacientes para mostrar"
          description={
            query.trim()
              ? 'Ningún paciente coincide con la búsqueda.'
              : filter === 'all'
                ? emptyDescription
                : emptyMessages[filter]
          }
        />
      ) : (
        <ul className="flex flex-col gap-2.5" aria-label="Lista de pacientes">
          {visibleSummaries.map((summary) => (
            <li key={summary.patient.id}>
              <PatientSummaryRow
                summary={summary}
                todayIso={todayIso}
                onOpen={(item) => setSelectedId(item.patient.id)}
              />
            </li>
          ))}
        </ul>
      )}

      <PatientDetailModal
        summary={selected}
        todayIso={todayIso}
        branchName={branchName}
        onClose={() => setSelectedId(null)}
      />
    </div>
  );
}

export default PatientsOverview;
