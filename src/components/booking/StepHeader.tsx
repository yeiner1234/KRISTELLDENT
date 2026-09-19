import type { LucideIcon } from 'lucide-react';

interface StepHeaderProps {
  icon: LucideIcon;
  title: string;
  subtitle: string;
}

function StepHeader({ icon: Icon, title, subtitle }: StepHeaderProps) {
  return (
    <div className="mb-[22px]">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
        <Icon size={18} />
      </span>
      <h2 className="mt-3 text-[22px] font-semibold text-brand-900">{title}</h2>
      <p className="mt-1 max-w-xl text-sm leading-relaxed text-ink-tertiary">{subtitle}</p>
    </div>
  );
}

export default StepHeader;
