import type { LucideIcon } from 'lucide-react';

export interface FilterTab<T extends string> {
  value: T;
  label: string;
  icon?: LucideIcon;
  count?: number;
  // Clases del botón activo (fondo y texto); por defecto, el color de la marca.
  activeClassName?: string;
}

interface FilterTabsProps<T extends string> {
  tabs: FilterTab<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
}

// Pestañas tipo píldora con contador, como las de Pacientes. En celular se
// desplazan de lado dentro de su caja, nunca la página entera.
function FilterTabs<T extends string>({ tabs, value, onChange, ariaLabel }: FilterTabsProps<T>) {
  return (
    <div role="tablist" aria-label={ariaLabel} className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
      {tabs.map(({ value: tabValue, label, icon: Icon, count, activeClassName }) => {
        const isActive = tabValue === value;
        return (
          <button
            key={tabValue}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tabValue)}
            className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-medium transition-colors ${
              isActive
                ? (activeClassName ??
                  'border-transparent bg-gradient-to-r from-brand-600 to-kd-aqua-500 text-white shadow-[0_4px_12px_rgba(15,123,134,0.28)]')
                : 'border-adm-line-control bg-white text-adm-ink-500 hover:border-adm-accent-line hover:bg-adm-surface-sel'
            }`}
          >
            {Icon && <Icon size={15} aria-hidden="true" />}
            {label}
            {count !== undefined && (
              <span
                className={`min-w-6 rounded-full px-1.5 text-center text-xs font-semibold [font-variant-numeric:tabular-nums] ${
                  isActive ? 'bg-white/25' : 'bg-adm-line-div text-adm-ink-400'
                }`}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default FilterTabs;
