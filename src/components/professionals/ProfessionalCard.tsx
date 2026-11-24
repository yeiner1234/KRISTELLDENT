import type { ReactNode } from 'react';
import { CalendarRange, Clock, MapPin, Pencil } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Professional } from '../../types/Professional';
import { getInitials } from '../../utils/format';
import type { ProfessionalStatus } from '../../utils/professionalProfile';
import StatusBadge from '../common/StatusBadge';
import Button from '../common/Button';

interface ProfessionalCardProps {
  professional: Professional;
  specialtyName?: string;
  meta?: string;
  variant?: 'public' | 'admin';
  agendaHref?: string;
  onEdit?: () => void;
  onSchedule?: () => void;
  // Panel admin: estado de cuenta y ficha (professionalStatus).
  status?: ProfessionalStatus;
  // Panel admin: aviso dentro de la tarjeta (p. ej. ficha incompleta) y
  // acciones extra al pie (p. ej. desactivar ficha).
  notice?: ReactNode;
  footer?: ReactNode;
}

function ProfessionalCard({
  professional,
  specialtyName,
  meta,
  variant = 'public',
  agendaHref,
  onEdit,
  onSchedule,
  status,
  notice,
  footer,
}: ProfessionalCardProps) {
  const fullName = professional.fullName;
  const initials = getInitials(professional.fullName);

  if (variant === 'admin') {
    // h-full: en una fila de la cuadrícula todas las tarjetas miden lo mismo y
    // los botones quedan alineados abajo (mt-auto).
    return (
      <div data-testid="professional-card" className="flex h-full flex-col gap-3.5 rounded-[14px] border border-adm-line-card bg-white p-5 shadow-soft transition-shadow duration-[180ms] hover:border-[#d7e2e6] hover:shadow-adm-elev-1">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#dceef0] text-sm font-semibold text-adm-accent-deep">
            {initials}
          </span>
          <div className="flex min-w-0 flex-col gap-0.5">
            <p className="truncate text-[15.5px] font-semibold text-adm-ink-700" title={fullName}>
              {fullName}
            </p>
            {specialtyName && (
              <p className="truncate text-sm font-medium text-adm-accent-deep" title={specialtyName}>
                {specialtyName}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col items-start gap-2.5">
          {meta && (
            <span className="flex items-start gap-1.5 text-[13px] leading-snug text-adm-ink-400">
              <MapPin size={14} strokeWidth={1.75} className="mt-px shrink-0 text-adm-ink-300" />
              {meta}
            </span>
          )}
          <StatusBadge
            label={status?.label ?? (professional.active ? 'Activa' : 'Ficha desactivada')}
            tone={status?.tone ?? (professional.active ? 'adm-active' : 'adm-inactive')}
          />
        </div>

        {notice}

        <div className="mt-auto flex flex-col gap-2 border-t border-adm-line-div pt-3.5">
          <div className="grid grid-cols-2 gap-2">
            {agendaHref && (
              <Link
                to={agendaHref}
                className="col-span-2 flex h-10 min-h-11 items-center justify-center gap-2 rounded-[9px] border border-adm-accent-line bg-adm-surface-sel text-sm font-semibold text-adm-accent-deep transition-colors hover:bg-adm-accent-soft sm:min-h-0"
              >
                <CalendarRange size={15} />
                Ver agenda
              </Link>
            )}
            {onSchedule && (
              <Button type="button" variant="admin-outline" size="md" className="w-full" icon={<Clock size={15} />} onClick={onSchedule}>
                Horario
              </Button>
            )}
            <Button
              type="button"
              variant="admin-outline"
              size="md"
              className={`w-full ${onSchedule ? '' : 'col-span-2'}`}
              icon={<Pencil size={14} />}
              onClick={onEdit}
            >
              Editar
            </Button>
          </div>
          {footer}
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl bg-white transition-all duration-200 hover:-translate-y-1">
      <div
        aria-hidden="true"
        className="aspect-square w-full"
        style={{ background: 'linear-gradient(150deg, #d2e9ec, #a8d5db)' }}
      />
      <div className="p-4">
        <p className="text-[15.5px] font-semibold text-brand-900">{fullName}</p>
        {specialtyName && <p className="text-sm font-medium text-brand-700">{specialtyName}</p>}
        {meta && <p className="text-sm text-ink-tertiary">{meta}</p>}
      </div>
    </div>
  );
}

export default ProfessionalCard;
