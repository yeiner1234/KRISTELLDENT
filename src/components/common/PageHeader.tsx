import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  subtitle?: ReactNode;
  icon: LucideIcon;
  // Botón principal (p. ej. "Agregar") a la derecha.
  action?: ReactNode;
}

// Encabezado de las pantallas del panel admin: tarjeta con un degradado suave
// en los colores del logo (verde azulado, aguamarina y rosa).
function PageHeader({ title, subtitle, icon: Icon, action }: PageHeaderProps) {
  return (
    <header className="relative overflow-hidden rounded-[18px] border border-adm-line-card bg-gradient-to-br from-white via-kd-aqua-50 to-kd-pink-50 p-5 shadow-soft sm:p-6">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-10 -top-14 h-40 w-40 rounded-full bg-kd-pink-100/70 blur-2xl"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-16 right-1/3 h-36 w-36 rounded-full bg-kd-aqua-100/80 blur-2xl"
      />

      <div className="relative flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-600 to-kd-aqua-500 text-white shadow-[0_8px_18px_rgba(15,123,134,0.3)]">
            <Icon size={22} aria-hidden="true" />
          </span>
          <div className="flex min-w-0 flex-col gap-1">
            <h2 className="text-pretty text-[clamp(22px,2.6vw,28px)] font-semibold tracking-[-0.02em] text-brand-900">
              {title}
            </h2>
            {subtitle && <p className="text-pretty text-[13.5px] text-adm-ink-400">{subtitle}</p>}
          </div>
        </div>
        {action}
      </div>
      <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[3px] bg-gradient-to-r from-brand-600 via-kd-aqua-500 to-kd-pink-500" />
    </header>
  );
}

export default PageHeader;
