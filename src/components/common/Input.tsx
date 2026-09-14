import type { InputHTMLAttributes } from 'react';
import { useId } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

function Input({ label, error, id, className = '', ...rest }: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <div className="flex flex-col gap-1.5 text-left">
      <label htmlFor={inputId} className="text-sm font-medium text-ink-secondary">
        {label}
      </label>
      <input
        id={inputId}
        className={`rounded-xl border px-4 py-2.5 text-sm text-brand-900 outline-none transition-colors focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20 ${
          error ? 'border-rose-400' : 'border-border'
        } ${className}`}
        {...rest}
      />
      {error && <span className="text-xs font-medium text-rose-600">{error}</span>}
    </div>
  );
}

export default Input;
