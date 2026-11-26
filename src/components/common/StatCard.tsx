import type { LucideIcon } from 'lucide-react';
import { accentClasses } from './accentClasses';
import type { AccentTone } from '../../utils/accentTone';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  alert?: boolean;
  // Con tono, la tarjeta de color del panel admin (franja e icono en degradado).
  tone?: AccentTone;
}

function StatCard({ label, value, icon: Icon, trend, alert = false, tone }: StatCardProps) {
  if (tone) {
    const accent = accentClasses[tone];
    return (
      <div className="relative flex flex-col gap-3 overflow-hidden rounded-[16px] border border-adm-line-card bg-white p-[18px_20px] shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-adm-elev-2">
        <span aria-hidden="true" className={`absolute inset-x-0 top-0 h-1.5 ${accent.stripe}`} />
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute -bottom-10 -right-10 h-28 w-28 rounded-full opacity-70 ${accent.soft}`}
        />
        <div className="relative flex items-center justify-between gap-3">
          <span className="text-[13px] font-medium text-adm-ink-400">{label}</span>
          <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${accent.tile}`}>
            <Icon size={19} strokeWidth={1.9} />
          </span>
        </div>
        <p className="relative text-[32px] font-semibold tracking-[-0.02em] text-adm-ink-700 [font-variant-numeric:tabular-nums]">
          {value}
        </p>
        {trend && <p className={`relative text-xs font-semibold ${accent.text}`}>{trend}</p>}
      </div>
    );
  }

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
