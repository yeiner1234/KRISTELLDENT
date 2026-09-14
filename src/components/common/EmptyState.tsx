import { Inbox, type LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
}

function EmptyState({ title, description, icon: Icon = Inbox }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border px-6 py-12 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-tint text-ink-tertiary">
        <Icon size={22} />
      </span>
      <p className="text-sm font-semibold text-brand-900">{title}</p>
      {description && <p className="max-w-xs text-sm text-ink-tertiary">{description}</p>}
    </div>
  );
}

export default EmptyState;
