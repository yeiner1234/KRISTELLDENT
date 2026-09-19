import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  alert?: boolean;
}

function StatCard({ label, value, icon: Icon, trend, alert = false }: StatCardProps) {
  return (
    <div className="flex flex-col gap-3 rounded-[14px] border border-adm-line-card bg-white p-[18px_20px] shadow-soft">
      <div className="flex items-center justify-between">
        <span className="text-[13px] text-adm-ink-400">{label}</span>
        <span
          className={`flex h-8 w-8 items-center justify-center rounded-[9px] ${
            alert ? 'bg-adm-status-pending-bg text-adm-status-pending-text' : 'bg-brand-50 text-adm-accent-deep'
          }`}
        >
          <Icon size={18} strokeWidth={1.75} />
        </span>
      </div>
      <p className="text-[30px] font-semibold tracking-[-0.02em] text-adm-ink-700 [font-variant-numeric:tabular-nums]">
        {value}
      </p>
      {trend && (
        <p className={`text-xs font-medium ${alert ? 'text-adm-status-pending-text' : 'text-adm-ink-400'}`}>
          {trend}
        </p>
      )}
    </div>
  );
}

export default StatCard;
