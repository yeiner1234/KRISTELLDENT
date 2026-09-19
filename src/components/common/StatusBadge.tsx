type StatusTone = 'success' | 'warning' | 'danger' | 'neutral' | 'brand';
type AdminStatusTone = 'adm-confirmed' | 'adm-pending' | 'adm-cancelled' | 'adm-completed' | 'adm-active' | 'adm-inactive';

interface StatusBadgeProps {
  label: string;
  tone?: StatusTone | AdminStatusTone;
}

const toneClasses: Record<StatusTone, { bg: string; text: string; dot: string }> = {
  success: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  warning: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  danger: { bg: 'bg-rose-50', text: 'text-rose-700', dot: 'bg-rose-500' },
  neutral: { bg: 'bg-tint', text: 'text-ink-secondary', dot: 'bg-ink-tertiary' },
  brand: { bg: 'bg-brand-50', text: 'text-brand-700', dot: 'bg-brand-600' },
};

const adminToneClasses: Record<AdminStatusTone, { bg: string; text: string; dot: string }> = {
  'adm-confirmed': {
    bg: 'bg-adm-status-confirmed-bg',
    text: 'text-adm-status-confirmed-text',
    dot: 'bg-adm-status-confirmed-solid',
  },
  'adm-pending': {
    bg: 'bg-adm-status-pending-bg',
    text: 'text-adm-status-pending-text',
    dot: 'bg-adm-status-pending-solid',
  },
  'adm-cancelled': {
    bg: 'bg-adm-status-cancelled-bg',
    text: 'text-adm-status-cancelled-text',
    dot: 'bg-adm-status-cancelled-solid',
  },
  'adm-completed': {
    bg: 'bg-adm-status-completed-bg',
    text: 'text-adm-status-completed-text',
    dot: 'bg-adm-status-completed-solid',
  },
  'adm-active': {
    bg: 'bg-adm-status-confirmed-bg',
    text: 'text-adm-status-confirmed-text',
    dot: 'bg-adm-status-confirmed-solid',
  },
  'adm-inactive': {
    bg: 'bg-adm-status-completed-bg',
    text: 'text-adm-ink-400',
    dot: 'bg-adm-ink-300',
  },
};

function isAdminTone(tone: StatusTone | AdminStatusTone): tone is AdminStatusTone {
  return tone.startsWith('adm-');
}

function StatusBadge({ label, tone = 'neutral' }: StatusBadgeProps) {
  const classes = isAdminTone(tone) ? adminToneClasses[tone] : toneClasses[tone];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${classes.bg} ${classes.text}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${classes.dot}`} />
      {label}
    </span>
  );
}

export default StatusBadge;
