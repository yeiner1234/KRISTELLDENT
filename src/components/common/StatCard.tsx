import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
}

function StatCard({ label, value, icon: Icon, trend }: StatCardProps) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-white p-5 shadow-soft">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-ink-tertiary">{label}</span>
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
          <Icon size={18} />
        </span>
      </div>
      <p className="text-2xl font-semibold text-brand-900">{value}</p>
      {trend && <p className="text-xs text-ink-tertiary">{trend}</p>}
    </div>
  );
}

export default StatCard;
