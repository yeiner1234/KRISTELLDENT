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
}

function Select({ label, options, error, id, className = '', ...rest }: SelectProps) {
  const generatedId = useId();
  const selectId = id ?? generatedId;

  return (
    <div className="flex flex-col gap-1.5 text-left">
      <label htmlFor={selectId} className="text-sm font-medium text-ink-secondary">
        {label}
      </label>
      <select
        id={selectId}
        className={`rounded-xl border bg-white px-4 py-2.5 text-sm text-brand-900 outline-none transition-colors focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20 ${
          error ? 'border-rose-400' : 'border-border'
        } ${className}`}
        {...rest}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <span className="text-xs font-medium text-rose-600">{error}</span>}
    </div>
  );
}

export default Select;
