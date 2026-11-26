import type { AppointmentStatus } from '../../types/Appointment';
import { formatAppointmentStatus } from '../../utils/format';

interface AppointmentStatusTabsProps {
  value: AppointmentStatus | '';
  onChange: (status: AppointmentStatus | '') => void;
  counts: Record<AppointmentStatus | '', number>;
}

const tabs: { value: AppointmentStatus | ''; dot: string; active: string }[] = [
  { value: '', dot: 'bg-adm-accent-deep', active: 'border-adm-accent-deep bg-adm-accent-deep' },
  { value: 'pending', dot: 'bg-adm-status-pending-solid', active: 'border-adm-status-pending-solid bg-adm-status-pending-solid' },
  {
    value: 'confirmed',
    dot: 'bg-adm-status-confirmed-solid',
    active: 'border-adm-status-confirmed-solid bg-adm-status-confirmed-solid',
  },
  { value: 'in_room', dot: 'bg-adm-status-in-room-solid', active: 'border-adm-status-in-room-solid bg-adm-status-in-room-solid' },
  {
    value: 'completed',
    dot: 'bg-adm-status-completed-solid',
    active: 'border-adm-status-completed-solid bg-adm-status-completed-solid',
  },
  {
    value: 'cancelled',
    dot: 'bg-adm-status-cancelled-solid',
    active: 'border-adm-status-cancelled-solid bg-adm-status-cancelled-solid',
  },
];

// Pestañas de estado con cuántas citas hay en cada uno.
function AppointmentStatusTabs({ value, onChange, counts }: AppointmentStatusTabsProps) {
  return (
    <div role="tablist" aria-label="Filtrar por estado" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
      {tabs.map((tab) => {
        const isActive = value === tab.value;
        const label = tab.value ? formatAppointmentStatus(tab.value) : 'Todas';
        return (
          <button
            key={tab.value || 'all'}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.value)}
            className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-medium transition-colors ${
              isActive
                ? `${tab.active} text-white`
                : 'border-adm-line-control bg-white text-adm-ink-500 hover:border-adm-accent-line hover:bg-adm-surface-sel'
            }`}
          >
            {!isActive && <span className={`h-2 w-2 rounded-full ${tab.dot}`} aria-hidden="true" />}
            {label}
            <span
              className={`min-w-6 rounded-full px-1.5 text-center text-xs font-semibold [font-variant-numeric:tabular-nums] ${
                isActive ? 'bg-white/25' : 'bg-adm-line-div text-adm-ink-400'
              }`}
            >
              {counts[tab.value]}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default AppointmentStatusTabs;
