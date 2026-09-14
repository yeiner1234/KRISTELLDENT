import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router-dom';

type ButtonSize = 'sm' | 'md' | 'lg';
type ButtonVariant = 'primary' | 'secondary';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  to?: string;
  icon?: ReactNode;
  size?: ButtonSize;
  variant?: ButtonVariant;
}

const baseClasses =
  'inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50';

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700',
  secondary: 'border border-border bg-white text-brand-900 hover:border-brand-600/40',
};

const sizeClasses: Record<ButtonVariant, Record<ButtonSize, string>> = {
  primary: {
    sm: 'h-10 rounded-full px-5 text-sm shadow-soft hover:shadow-soft-hover',
    md: 'h-11 rounded-full px-6 text-sm shadow-soft hover:shadow-soft-hover',
    lg: 'h-[52px] rounded-[13px] px-6 text-base shadow-cta',
  },
  secondary: {
    sm: 'h-10 rounded-full px-5 text-sm shadow-soft hover:shadow-soft-hover',
    md: 'h-11 rounded-full px-6 text-sm shadow-soft hover:shadow-soft-hover',
    lg: 'h-[52px] rounded-[13px] px-6 text-base shadow-soft hover:shadow-soft-hover',
  },
};

function Button({
  children,
  to,
  icon,
  size = 'md',
  variant = 'primary',
  className = '',
  type = 'button',
  ...rest
}: ButtonProps) {
  const classes = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[variant][size]} ${className}`;

  if (to) {
    return (
      <Link to={to} className={classes}>
        {children}
        {icon}
      </Link>
    );
  }

  return (
    <button type={type} className={classes} {...rest}>
      {children}
      {icon}
    </button>
  );
}

export default Button;
