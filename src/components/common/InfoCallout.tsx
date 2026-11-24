import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

interface InfoCalloutProps {
  icon: LucideIcon;
  title: string;
  children?: ReactNode;
}

// Aviso de bienvenida al abrir un modal o una sección: qué se hace aquí, en
// una frase. Turquesa suave, con icono.
function InfoCallout({ icon: Icon, title, children }: InfoCalloutProps) {
  return (
    <div className="flex items-start gap-3 rounded-[12px] bg-brand-50 p-3.5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-brand-600 shadow-soft">
        <Icon size={18} />
      </span>
      <p className="text-sm leading-[1.5] text-adm-ink-700">
        <span className="font-semibold text-brand-900">{title}</span>
        {children && <> {children}</>}
      </p>
    </div>
  );
}

export default InfoCallout;
