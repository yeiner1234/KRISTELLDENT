import type { LucideIcon } from 'lucide-react';

interface OptionCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  tag?: string;
  selected: boolean;
  onClick: () => void;
}

function OptionCard({ icon: Icon, title, description, tag, selected, onClick }: OptionCardProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className="rounded-2xl p-5 text-left transition-colors"
      style={{
        border: selected ? '1.5px solid #0f7b86' : '1px solid #e1e8ec',
        background: selected ? '#f5fafb' : '#ffffff',
        boxShadow: selected ? '0 0 0 3px #e6f3f5' : 'none',
      }}
      onMouseEnter={(event) => {
        if (!selected) {
          event.currentTarget.style.borderColor = '#b8d7dc';
          event.currentTarget.style.background = '#fbfdfd';
        }
      }}
      onMouseLeave={(event) => {
        if (!selected) {
          event.currentTarget.style.borderColor = '#e1e8ec';
          event.currentTarget.style.background = '#ffffff';
        }
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
          <Icon size={20} />
        </span>
        {tag && (
          <span className="rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-semibold text-brand-700">{tag}</span>
        )}
      </div>
      <p className="mt-3 text-base font-semibold text-brand-900">{title}</p>
      <p className="mt-1 text-sm leading-relaxed text-ink-tertiary">{description}</p>
    </button>
  );
}

export default OptionCard;
