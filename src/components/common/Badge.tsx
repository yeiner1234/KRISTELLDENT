import type { ReactNode } from 'react';

type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'brand';

interface BadgeProps {
  children: ReactNode;
  tone?: BadgeTone;
}

const toneClasses: Record<BadgeTone, string> = {
  neutral: 'bg-adm-line-div text-adm-ink-400',
  success: 'bg-adm-status-confirmed-bg text-adm-status-confirmed-text',
  warning: 'bg-adm-status-pending-bg text-adm-status-pending-text',
  danger: 'bg-adm-status-cancelled-bg text-adm-status-cancelled-text',
  brand: 'bg-adm-accent-soft text-adm-accent-ink',
};

function Badge({ children, tone = 'neutral' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${toneClasses[tone]}`}>
      {children}
    </span>
  );
}

export default Badge;
