import { useMemo, useState } from 'react';
import { BarChart3, CalendarCheck, CalendarX2, CheckCircle2, Clock, UserX } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import StatCard from '../../components/common/StatCard';
import DataTable, { type DataTableColumn } from '../../components/common/DataTable';
import EmptyState from '../../components/common/EmptyState';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import Spinner from '../../components/common/Spinner';
import { useAuth } from '../../hooks/useAuth';
import { useAdminProfessionals } from '../../hooks/useAdminProfessionals';
import { useAdminBranches } from '../../hooks/useAdminBranches';
import { useAppointmentIndicators } from '../../hooks/useAppointmentIndicators';
import type { IndicatorFilters } from '../../services/indicatorService';
import { indicatorShare, monthRange, type IndicatorBreakdown } from '../../utils/appointmentIndicators';
import { getTodayIsoDate } from '../../utils/date';

function countColumns(): DataTableColumn<IndicatorBreakdown>[] {
  const number = (value: number) => <span className="[font-variant-numeric:tabular-nums]">{value}</span>;
  return [
    { key: 'reserved', header: 'Reservadas', render: (row) => <strong className="font-semibold">{row.reserved}</strong> },
    { key: 'attended', header: 'Atendidas', render: (row) => number(row.attended) },
    { key: 'noShow', header: 'No asistidas', render: (row) => number(row.noShow) },
    { key: 'cancelled', header: 'Canceladas', render: (row) => number(row.cancelled) },
    { key: 'upcoming', header: 'Por atender', render: (row) => number(row.upcoming) },
  ];
}

// HU16: indicadores de las citas del periodo. El admin_sede ve solo su sede
// (lo garantiza la RLS en la RPC); el admin_global, todas y puede elegir una.
function IndicatorsPage() {
  const { user } = useAuth();
  const isAdminGlobal = user?.role === 'admin_global';
  const { professionals } = useAdminProfessionals();
  const { branches } = useAdminBranches();
  const [filters, setFilters] = useState<IndicatorFilters>(() => ({
    ...monthRange(getTodayIsoDate()),
    professionalId: '',
    branchId: '',
  }));
  const { summary, isLoading, error } = useAppointmentIndicators(filters);
  const update = (patch: Partial<IndicatorFilters>) => setFilters((current) => ({ ...current, ...patch }));
  const rangeError = filters.from && filters.to && filters.from > filters.to ? 'La fecha inicial no puede ser posterior a la final.' : null;

  const professionalName = useMemo(() => new Map(professionals.map((item) => [item.id, item.fullName])), [professionals]);
  const branchName = useMemo(() => new Map(branches.map((item) => [item.id, item.name])), [branches]);

  const professionalColumns: DataTableColumn<IndicatorBreakdown>[] = [
    { key: 'name', header: 'Profesional', render: (row) => <span className="font-medium">{professionalName.get(row.id) || '—'}</span> },
    ...countColumns(),
  ];
  const branchColumns: DataTableColumn<IndicatorBreakdown>[] = [
    { key: 'name', header: 'Sede', render: (row) => <span className="font-medium">{branchName.get(row.id) || '—'}</span> },
    ...countColumns(),
  ];

  const { totals } = summary;
  const share = (value: number) => `${indicatorShare(value, totals.reserved)} % del total`;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Indicadores"
        icon={BarChart3}
        subtitle={isAdminGlobal ? 'Citas del periodo por estado, de todas las sedes.' : 'Citas del periodo por estado, de tu sede.'}
      />

      <div className="grid gap-3 rounded-2xl border border-adm-line-card bg-white p-4 shadow-soft sm:grid-cols-2 lg:grid-cols-4">
        <Input label="Desde" type="date" variant="admin" value={filters.from} max={filters.to || undefined} onChange={(event) => update({ from: event.target.value })} />
        <Input label="Hasta" type="date" variant="admin" value={filters.to} min={filters.from || undefined} onChange={(event) => update({ to: event.target.value })} />
        <Select
          label="Profesional"
          value={filters.professionalId}
          onChange={(event) => update({ professionalId: event.target.value })}
          options={[
            { value: '', label: 'Todos los profesionales' },
            ...professionals.filter((item) => item.fullName).map((item) => ({ value: item.id, label: item.fullName })),
          ]}
        />
        {isAdminGlobal && (
          <Select
            label="Sede"
            value={filters.branchId}
            onChange={(event) => update({ branchId: event.target.value })}
            options={[{ value: '', label: 'Todas las sedes' }, ...branches.map((item) => ({ value: item.id, label: item.name }))]}
          />
        )}
      </div>

      {rangeError ? (
        <EmptyState icon={CalendarX2} title="Revisa el periodo" description={rangeError} />
      ) : isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner size={30} />
        </div>
      ) : error ? (
        <EmptyState icon={BarChart3} title="No se pudieron cargar los indicadores" description={error} />
      ) : (
        <>
          <section aria-label="Resumen del periodo" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <StatCard label="Reservadas" value={totals.reserved} icon={CalendarCheck} tone="teal" trend="Todas las citas del periodo" />
            <StatCard label="Atendidas" value={totals.attended} icon={CheckCircle2} tone="aqua" trend={share(totals.attended)} />
            <StatCard label="No asistidas" value={totals.noShow} icon={UserX} tone="caramel" trend={share(totals.noShow)} />
            <StatCard label="Canceladas" value={totals.cancelled} icon={CalendarX2} tone="pink" trend={share(totals.cancelled)} />
            <StatCard label="Por atender" value={totals.upcoming} icon={Clock} tone="teal" trend={share(totals.upcoming)} />
          </section>

          {totals.reserved === 0 ? (
            <EmptyState icon={CalendarCheck} title="No hay citas en este periodo" description="Cambia las fechas o el profesional para ver otros indicadores." />
          ) : (
            <>
              <section className="flex flex-col gap-3" aria-label="Por profesional">
                <h3 className="text-base font-semibold text-adm-ink-700">Por profesional</h3>
                <DataTable columns={professionalColumns} rows={summary.byProfessional} getRowId={(row) => row.id} />
              </section>
              {isAdminGlobal && !filters.branchId && (
                <section className="flex flex-col gap-3" aria-label="Por sede">
                  <h3 className="text-base font-semibold text-adm-ink-700">Por sede</h3>
                  <DataTable columns={branchColumns} rows={summary.byBranch} getRowId={(row) => row.id} />
                </section>
              )}
            </>
          )}
          <p className="text-xs text-adm-ink-300">
            No asistidas: citas pendientes o confirmadas cuya hora ya pasó. Por atender: citas futuras y pacientes en sala.
          </p>
        </>
      )}
    </div>
  );
}

export default IndicatorsPage;
