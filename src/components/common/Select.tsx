import type { SelectHTMLAttributes } from 'react';
import { useId } from 'react';

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: SelectOption[];
  error?: string;
  hideLabel?: boolean;
}

function Select({ label, options, error, id, hideLabel = false, className = '', ...rest }: SelectProps) {
  const generatedId = useId();
  const selectId = id ?? generatedId;

  return (
    <div className="flex flex-col gap-1.5 text-left">
      <label htmlFor={selectId} className={`text-sm font-medium text-adm-ink-700 ${hideLabel ? 'sr-only' : ''}`}>
        {label}
      </label>
      <select
        id={selectId}
        className={`h-[42px] rounded-[10px] border bg-adm-surface-input px-3.5 text-sm text-adm-ink-700 outline-none transition-colors focus:border-brand-600 focus:bg-white focus:ring-2 focus:ring-adm-accent-ring ${
          error ? 'border-adm-danger-text' : 'border-adm-line-field'
        } ${className}`}
        {...rest}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <span className="text-xs font-medium text-adm-danger-text">{error}</span>}
    </div>
  );
}

export default Select;
