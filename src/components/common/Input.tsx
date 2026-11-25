import type { InputHTMLAttributes } from 'react';
import { useId, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  variant?: 'public' | 'admin';
}

function Input({ label, error, id, variant = 'public', className = '', type, ...rest }: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  // Contraseña: el ojo la muestra u oculta.
  const isPassword = type === 'password';
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const fieldClasses =
    variant === 'admin'
      ? `h-[42px] min-h-11 rounded-[10px] border bg-adm-surface-input px-3.5 text-base text-adm-ink-700 outline-none transition-colors focus:border-brand-600 focus:bg-white focus:ring-2 focus:ring-adm-accent-ring sm:min-h-0 sm:text-sm read-only:cursor-not-allowed read-only:border-dashed read-only:bg-adm-line-faint read-only:text-adm-ink-400 read-only:focus:bg-adm-line-faint ${
          error ? 'border-adm-danger-text' : 'border-adm-line-field'
        }`
      : `min-h-11 rounded-xl border px-4 py-2.5 text-base text-brand-900 outline-none transition-colors focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20 sm:min-h-0 sm:text-sm ${
          error ? 'border-rose-400' : 'border-border'
        }`;

  const labelClasses = variant === 'admin' ? 'text-sm font-medium text-adm-ink-700' : 'text-sm font-medium text-ink-secondary';
  const errorClasses = variant === 'admin' ? 'text-xs font-medium text-adm-danger-text' : 'text-xs font-medium text-rose-600';

  return (
    <div className="flex flex-col gap-1.5 text-left">
      <label htmlFor={inputId} className={labelClasses}>
        {label}
      </label>
      {isPassword ? (
        <div className="relative flex flex-col">
          <input
            id={inputId}
            type={isPasswordVisible ? 'text' : 'password'}
            className={`${fieldClasses} pr-12 ${className}`}
            {...rest}
          />
          <button
            type="button"
            onClick={() => setIsPasswordVisible((visible) => !visible)}
            aria-label={isPasswordVisible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            aria-pressed={isPasswordVisible}
            aria-controls={inputId}
            title={isPasswordVisible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-[10px] text-adm-ink-300 transition-colors hover:text-adm-accent-deep focus-visible:text-adm-accent-deep focus-visible:outline-none"
          >
            {isPasswordVisible ? <EyeOff size={18} strokeWidth={1.75} /> : <Eye size={18} strokeWidth={1.75} />}
          </button>
        </div>
      ) : (
        <input id={inputId} type={type} className={`${fieldClasses} ${className}`} {...rest} />
      )}
      {error && <span className={errorClasses}>{error}</span>}
    </div>
  );
}

export default Input;
