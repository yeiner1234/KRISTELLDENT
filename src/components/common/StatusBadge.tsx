type StatusTone = 'success' | 'warning' | 'danger' | 'neutral' | 'brand';

interface StatusBadgeProps {
  label: string;
  tone?: StatusTone;
}

const toneClasses: Record<StatusTone, { bg: string; text: string; dot: string }> = {
  success: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  warning: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  danger: { bg: 'bg-rose-50', text: 'text-rose-700', dot: 'bg-rose-500' },
  neutral: { bg: 'bg-tint', text: 'text-ink-secondary', dot: 'bg-ink-tertiary' },
  brand: { bg: 'bg-brand-50', text: 'text-brand-700', dot: 'bg-brand-600' },
};

function StatusBadge({ label, tone = 'neutral' }: StatusBadgeProps) {
  const classes = toneClasses[tone];

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
