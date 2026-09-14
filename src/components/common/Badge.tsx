import type { ReactNode } from 'react';

type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'brand';

interface BadgeProps {
  children: ReactNode;
  tone?: BadgeTone;
}

const toneClasses: Record<BadgeTone, string> = {
  neutral: 'bg-tint text-ink-secondary',
  success: 'bg-emerald-100 text-emerald-700',
  warning: 'bg-amber-100 text-amber-700',
  danger: 'bg-rose-100 text-rose-700',
  brand: 'bg-tint text-brand-700',
};

function Badge({ children, tone = 'neutral' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${toneClasses[tone]}`}>
      {children}
    </span>
  );
}

export default Badge;
