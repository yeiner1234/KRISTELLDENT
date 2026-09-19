import { CalendarCheck, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Professional } from '../../types/Professional';
import { getInitials } from '../../utils/format';
import StatusBadge from '../common/StatusBadge';
import Button from '../common/Button';

interface ProfessionalCardProps {
  professional: Professional;
  specialtyName?: string;
  meta?: string;
  variant?: 'public' | 'admin';
  agendaHref?: string;
  onEdit?: () => void;
}

function ProfessionalCard({ professional, specialtyName, meta, variant = 'public', agendaHref, onEdit }: ProfessionalCardProps) {
  const fullName = professional.fullName;
  const initials = getInitials(professional.fullName);

  if (variant === 'admin') {
    return (
      <div className="flex flex-col gap-4 rounded-[14px] border border-adm-line-card bg-white p-5 shadow-soft transition-shadow duration-[180ms] hover:border-[#d7e2e6] hover:shadow-adm-elev-1">
        <div className="flex items-start gap-3">
          <span
            className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full border border-adm-line-control text-[13px] font-semibold text-adm-ink-400"
            style={{
              backgroundImage: 'repeating-linear-gradient(135deg, #eaf1f3 0 5px, #f5f9fa 5px 10px)',
            }}
          >
            {initials}
          </span>
          <div className="flex min-w-0 flex-col gap-0.5">
            <p className="truncate text-[15.5px] font-semibold text-adm-ink-700">{fullName}</p>
            {specialtyName && <p className="truncate text-sm font-medium text-adm-accent-deep">{specialtyName}</p>}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          {meta && (
            <span className="flex items-center gap-1.5 text-[13px] text-adm-ink-400">
              <Clock size={14} strokeWidth={1.75} />
              {meta}
            </span>
          )}
          <span className="flex items-center gap-1.5 text-[13px] text-adm-ink-400">
            <CalendarCheck size={14} strokeWidth={1.75} />
            Agenda publicada
          </span>
          <StatusBadge label={professional.active ? 'Activo' : 'Inactivo'} tone={professional.active ? 'adm-active' : 'adm-inactive'} />
        </div>

        <div className="flex gap-2 border-t border-adm-line-div pt-3.5">
          {agendaHref ? (
            <Link
              to={agendaHref}
              className="flex h-9 flex-1 items-center justify-center rounded-[9px] border border-adm-accent-line bg-adm-surface-sel text-[13px] font-medium text-adm-accent-deep transition-colors hover:bg-adm-accent-soft"
            >
              Ver agenda
            </Link>
          ) : (
            <span className="flex-1" />
          )}
          <Button type="button" variant="admin-outline" size="xs" className="h-9" onClick={onEdit}>
            Editar
          </Button>
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
