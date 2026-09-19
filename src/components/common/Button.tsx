import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router-dom';

type ButtonVariant = 'primary' | 'secondary';
type ButtonSize = 'sm' | 'md' | 'lg';

type AdminButtonVariant = 'admin-solid' | 'admin-outline' | 'admin-ghost' | 'admin-danger';
type AdminButtonSize = 'xs' | 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  to?: string;
  icon?: ReactNode;
  size?: ButtonSize | AdminButtonSize;
  variant?: ButtonVariant | AdminButtonVariant;
}

const sharedClasses =
  'inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50';

const publicVariantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700',
  secondary: 'border border-border bg-white text-brand-900 hover:border-brand-600/40',
};

const publicSizeClasses: Record<ButtonVariant, Record<ButtonSize, string>> = {
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

const adminVariantClasses: Record<AdminButtonVariant, string> = {
  'admin-solid': 'bg-brand-600 text-white hover:bg-brand-700',
  'admin-outline': 'border border-adm-line-control bg-white text-adm-ink-700 hover:bg-adm-surface-hover',
  'admin-ghost': 'text-adm-ink-400 hover:bg-adm-line-faint hover:text-adm-accent-deep',
  'admin-danger': 'border border-adm-danger-border bg-white text-adm-danger-text hover:bg-adm-status-cancelled-bg',
};

const adminSizeClasses: Record<AdminButtonSize, string> = {
  xs: 'h-[30px] rounded-[7px] px-3 text-[13px]',
  sm: 'h-[34px] rounded-[9px] px-3.5 text-[13px]',
  md: 'h-10 rounded-[9px] px-4 text-sm',
  lg: 'h-11 rounded-[10px] px-5 text-[15px]',
};

function isAdminVariant(variant: ButtonVariant | AdminButtonVariant): variant is AdminButtonVariant {
  return variant.startsWith('admin-');
}

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
  const classes = isAdminVariant(variant)
    ? `${sharedClasses} transition-colors duration-[160ms] ${adminVariantClasses[variant]} ${
        adminSizeClasses[size in adminSizeClasses ? (size as AdminButtonSize) : 'md']
      } ${className}`
    : `${sharedClasses} transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${
        publicVariantClasses[variant]
      } ${publicSizeClasses[variant][size as ButtonSize]} ${className}`;

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
