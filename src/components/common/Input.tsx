import type { InputHTMLAttributes } from 'react';
import { useId } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  variant?: 'public' | 'admin';
}

function Input({ label, error, id, variant = 'public', className = '', ...rest }: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  const fieldClasses =
    variant === 'admin'
      ? `h-[42px] rounded-[10px] border bg-adm-surface-input px-3.5 text-sm text-adm-ink-700 outline-none transition-colors focus:border-brand-600 focus:bg-white focus:ring-2 focus:ring-adm-accent-ring ${
          error ? 'border-adm-danger-text' : 'border-adm-line-field'
        }`
      : `rounded-xl border px-4 py-2.5 text-sm text-brand-900 outline-none transition-colors focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20 ${
          error ? 'border-rose-400' : 'border-border'
        }`;

  const labelClasses = variant === 'admin' ? 'text-sm font-medium text-adm-ink-700' : 'text-sm font-medium text-ink-secondary';
  const errorClasses = variant === 'admin' ? 'text-xs font-medium text-adm-danger-text' : 'text-xs font-medium text-rose-600';

  return (
    <div className="flex flex-col gap-1.5 text-left">
      <label htmlFor={inputId} className={labelClasses}>
        {label}
      </label>
      <input id={inputId} className={`${fieldClasses} ${className}`} {...rest} />
      {error && <span className={errorClasses}>{error}</span>}
    </div>
  );
}

export default Input;
