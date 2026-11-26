import { createElement } from 'react';
import { MapPin, Pencil, Power, Trash2, UserRound } from 'lucide-react';
import Button from '../common/Button';
import ChipList from '../common/ChipList';
import ExpandableText from '../common/ExpandableText';
import StatusBadge from '../common/StatusBadge';
import { getSpecialtyIcon } from '../booking/specialtyIcons';
import { accentClasses, mutedAccent } from '../common/accentClasses';
import { accentToneFor } from '../../utils/accentTone';
import type { AdminSpecialty } from '../../types/Offer';

interface SpecialtyCardProps {
  specialty: AdminSpecialty;
  // Solo admin_global edita, desactiva y borra.
  canManage: boolean;
  busy: boolean;
  confirmingDelete: boolean;
  onEdit: () => void;
  onToggleActive: () => void;
  onAskDelete: () => void;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
}

const labelClass = 'text-[11px] font-semibold uppercase tracking-[0.06em] text-adm-ink-200';

// Una especialidad de la lista compartida: descripción recortada con "Ver más",
// sedes que la ofrecen y acciones al pie.
function SpecialtyCard({
  specialty,
  canManage,
  busy,
  confirmingDelete,
  onEdit,
  onToggleActive,
  onAskDelete,
  onCancelDelete,
  onConfirmDelete,
}: SpecialtyCardProps) {
  const accent = specialty.active ? accentClasses[accentToneFor(specialty.name)] : mutedAccent;

  return (
    <article
      aria-label={specialty.name}
      className={`relative flex w-full flex-col gap-4 overflow-hidden rounded-[16px] border bg-white p-5 pt-6 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-adm-elev-2 ${
        confirmingDelete ? 'border-adm-danger-border' : 'border-adm-line-card'
      }`}
    >
      <span aria-hidden="true" className={`absolute inset-x-0 top-0 h-1.5 ${accent.stripe}`} />
      <header className="flex items-start gap-3">
        <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${accent.tile}`}>
          {createElement(getSpecialtyIcon(specialty.name), { size: 20, 'aria-hidden': true })}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h3
            className={`text-pretty text-[15.5px] font-semibold leading-snug ${
              specialty.active ? 'text-adm-ink-700' : 'text-adm-ink-400'
            }`}
          >
            {specialty.name}
          </h3>
          <div>
            <StatusBadge
              label={specialty.active ? 'Activa' : 'Inactiva'}
              tone={specialty.active ? 'adm-active' : 'adm-inactive'}
            />
          </div>
        </div>
      </header>

      <ExpandableText text={specialty.description} />

      <div className="flex flex-col gap-1.5">
        <span className={`${labelClass} ${accent.text}`}>Se ofrece en</span>
        <ChipList
          items={specialty.branchNames}
          icon={<MapPin size={12} aria-hidden="true" />}
          emptyLabel="Ninguna sede todavía"
        />
      </div>

      <footer className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-adm-line-div pt-3.5">
        <span className="flex min-w-0 items-center gap-1.5 text-[12.5px] text-adm-ink-300">
          <UserRound size={13} aria-hidden="true" className="shrink-0" />
          <span className="truncate">{specialty.createdByName ?? 'Sin registro'}</span>
        </span>

        {canManage &&
          (confirmingDelete ? (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[13px] font-medium text-adm-danger-text">¿Borrarla?</span>
              <Button type="button" variant="admin-danger" size="xs" disabled={busy} onClick={onConfirmDelete}>
                Sí, borrar
              </Button>
              <Button type="button" variant="admin-outline" size="xs" onClick={onCancelDelete}>
                No
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <Button type="button" variant="admin-outline" size="xs" icon={<Pencil size={13} />} onClick={onEdit}>
                Editar
              </Button>
              <Button
                type="button"
                variant={specialty.active ? 'admin-ghost' : 'admin-outline'}
                size="xs"
                icon={busy ? undefined : <Power size={13} />}
                disabled={busy}
                onClick={onToggleActive}
              >
                {busy ? 'Guardando…' : specialty.active ? 'Desactivar' : 'Activar'}
              </Button>
              <button
                type="button"
                aria-label={`Borrar ${specialty.name}`}
                title="Borrar"
                onClick={onAskDelete}
                className="flex h-11 w-11 items-center justify-center rounded-[7px] text-adm-ink-300 transition-colors hover:bg-adm-status-cancelled-bg hover:text-adm-danger-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-adm-accent-ring sm:h-[30px] sm:w-[30px]"
              >
                <Trash2 size={15} aria-hidden="true" />
              </button>
            </div>
          ))}
      </footer>
    </article>
  );
}

export default SpecialtyCard;
