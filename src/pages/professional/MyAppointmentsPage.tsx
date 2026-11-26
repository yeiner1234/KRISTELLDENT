import { useMemo, useState } from 'react';
import { CalendarX2 } from 'lucide-react';
import SectionTitle from '../../components/common/SectionTitle';
import EmptyState from '../../components/common/EmptyState';
import Spinner from '../../components/common/Spinner';
import SearchInput from '../../components/common/SearchInput';
import AppointmentRow from '../../components/appointments/AppointmentRow';
import AppointmentDayList from '../../components/appointments/AppointmentDayList';
import AppointmentStatusTabs from '../../components/appointments/AppointmentStatusTabs';
import { useAuth } from '../../hooks/useAuth';
import { useMyAppointments } from '../../hooks/useAppointments';
import { useAppointmentStatusAction } from '../../hooks/useAppointmentStatusAction';
import { useAllPatients } from '../../hooks/usePatients';
import { useServices } from '../../hooks/useServices';
import { usePanelBranch } from '../../hooks/usePanelBranch';
import { filterByPanelBranch } from '../../utils/panelBranch';
import { ACTION_TARGET_STATUS, type AppointmentAction } from '../../utils/appointmentActions';
import { buildAppointmentViews, countAppointmentsByStatus, filterAppointmentViews } from '../../utils/appointmentViews';
import { getTodayIsoDate } from '../../utils/date';
import type { Appointment, AppointmentStatus } from '../../types/Appointment';

type Scope = 'upcoming' | 'past';

const scopes: { value: Scope; label: string }[] = [
  { value: 'upcoming', label: 'Próximas' },
  { value: 'past', label: 'Historial' },
];

function MyAppointmentsPage() {
  const { user } = useAuth();
  const role = user?.role ?? 'especialista';
  const { appointments, isLoading: isLoadingAppointments, error: appointmentsError, refetch } = useMyAppointments(user?.id);
  const { patients, isLoading: isLoadingPatients, error: patientsError } = useAllPatients();
  const { services, error: servicesError } = useServices();
  const error = appointmentsError ?? patientsError ?? servicesError;
  const statusAction = useAppointmentStatusAction(refetch);
  const isLoading = isLoadingAppointments || isLoadingPatients;
  const { selectedBranchId, branchName } = usePanelBranch();
  const todayIso = getTodayIsoDate();
  const [scope, setScope] = useState<Scope>('upcoming');
  const [status, setStatus] = useState<AppointmentStatus | ''>('');
  const [query, setQuery] = useState('');

  // De la sede elegida arriba. Próximas: de hoy en adelante, la más cercana
  // primero. Historial: lo anterior a hoy, lo más reciente primero.
  const scopedViews = useMemo(() => {
    const views = buildAppointmentViews(filterByPanelBranch(appointments, selectedBranchId), {
      patients,
      professionals: [],
      services,
    });
    const inScope = views.filter((view) =>
      scope === 'upcoming' ? view.appointment.date >= todayIso : view.appointment.date < todayIso,
    );
    return filterAppointmentViews(scope === 'past' ? inScope.reverse() : inScope, { query });
  }, [appointments, selectedBranchId, patients, services, scope, todayIso, query]);

  const statusCounts = useMemo(() => countAppointmentsByStatus(scopedViews), [scopedViews]);
  const views = useMemo(
    () => (status ? scopedViews.filter((view) => view.appointment.status === status) : scopedViews),
    [scopedViews, status],
  );

  const handleAction = (appointment: Appointment, action: AppointmentAction) => {
    if (action !== 'reschedule') {
      void statusAction.run(appointment, ACTION_TARGET_STATUS[action]);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionTitle title="Mis citas" align="left" />
        <span className="text-[13px] text-adm-ink-300">
          {views.length} {views.length === 1 ? 'cita' : 'citas'}
        </span>
      </div>

      <div className="flex flex-col gap-3 rounded-[14px] border border-adm-line-card bg-white p-4">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
          <div
            role="tablist"
            aria-label="Periodo"
            className="inline-flex shrink-0 rounded-[10px] border border-adm-line-control bg-adm-surface-app p-1"
          >
            {scopes.map((item) => (
              <button
                key={item.value}
                type="button"
                role="tab"
                aria-selected={scope === item.value}
                onClick={() => setScope(item.value)}
                className={`flex-1 rounded-[7px] px-4 py-1.5 text-sm font-medium transition-colors sm:flex-initial ${
                  scope === item.value ? 'bg-white text-adm-accent-deep shadow-soft' : 'text-adm-ink-400 hover:text-adm-ink-700'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <SearchInput
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar paciente, DNI o código..."
            aria-label="Buscar citas"
            wrapperClassName="min-w-[180px] flex-1"
          />
        </div>
        <AppointmentStatusTabs value={status} onChange={setStatus} counts={statusCounts} />
      </div>

      {statusAction.error && (
        <p
          role="alert"
          className="rounded-[10px] border border-adm-status-cancelled-border bg-adm-status-cancelled-bg px-3.5 py-2.5 text-sm font-medium text-adm-danger-text"
        >
          {statusAction.error}
        </p>
      )}

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Spinner size={28} />
        </div>
      ) : error ? (
        <EmptyState icon={CalendarX2} title="No se pudieron cargar tus citas" description={error} />
      ) : views.length === 0 ? (
        <EmptyState
          icon={CalendarX2}
          title={scope === 'upcoming' ? 'Sin citas próximas' : 'Sin citas anteriores'}
          description={
            scope === 'upcoming'
              ? 'Cuando tengas citas asignadas, aparecerán en esta lista.'
              : 'Aquí verás las citas de días anteriores.'
          }
        />
      ) : (
        <AppointmentDayList
          views={views}
          todayIso={todayIso}
          renderRow={(view) => (
            <AppointmentRow
              view={view}
              role={role}
              busy={statusAction.pendingId === view.appointment.id}
              onAction={handleAction}
              showProfessional={false}
              branchName={branchName(view.appointment.branchId)}
            />
          )}
        />
      )}
    </div>
  );
}

export default MyAppointmentsPage;
