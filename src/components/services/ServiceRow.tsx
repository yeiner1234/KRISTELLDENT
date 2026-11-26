import { Clock, Pencil, Power, UserRound, Wallet } from 'lucide-react';
import Button from '../common/Button';
import ChipList from '../common/ChipList';
import OfferStatusBadge from './OfferStatusBadge';
import { formatCurrency } from '../../utils/format';
import { professionalLabel } from '../../utils/offer';
import type { ServiceOfferStatus } from '../../types/Offer';

interface ServiceRowProps {
  row: ServiceOfferStatus;
  busy: boolean;
  onEdit: () => void;
  onToggleActive: () => void;
}

const labelClass = 'text-[11px] font-semibold uppercase tracking-[0.06em] text-adm-ink-200';
const metaChip =
  'inline-flex items-center gap-1.5 rounded-lg bg-adm-line-faint px-2.5 py-1 text-[13px] font-semibold text-adm-ink-700 [font-variant-numeric:tabular-nums]';

// Un servicio de la sede: precio y duración, profesionales (en ámbar las que
// no lo hacen visible en la reserva), estado y acciones. Sin tabla: en
// pantallas angostas se apila en vez de desplazarse de lado.
function ServiceRow({ row, busy, onEdit, onToggleActive }: ServiceRowProps) {
  const labels = row.professionals.map(professionalLabel);
  const notBookable = new Set(row.professionals.filter((pro) => !pro.bookable).map(professionalLabel));

  return (
    <div
      className={`grid gap-3.5 px-4 py-4 transition-colors hover:bg-adm-surface-hover sm:px-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1.4fr)_auto] lg:items-center lg:gap-6 ${
        row.active ? '' : 'opacity-70'
      }`}
    >
      <div className="flex min-w-0 flex-col gap-2">
        <p className="text-pretty text-[15px] font-semibold leading-snug text-adm-ink-700">{row.name}</p>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={metaChip}>
            <Wallet size={13} aria-hidden="true" className="text-adm-ink-300" />
            {formatCurrency(row.price)}
          </span>
          <span className={metaChip}>
            <Clock size={13} aria-hidden="true" className="text-adm-ink-300" />
            {row.duration} min
          </span>
        </div>
      </div>

      <div className="flex min-w-0 flex-col gap-2">
        <div className="flex flex-col gap-1.5">
          <span className={labelClass}>Profesionales</span>
          <ChipList
            items={labels}
            max={2}
            emptyLabel="Sin asignar"
            icon={<UserRound size={12} aria-hidden="true" />}
            chipClassName={(item) =>
              notBookable.has(item)
                ? 'border-adm-status-pending-border bg-adm-status-pending-bg text-adm-status-pending-text'
                : 'border-adm-line-control bg-adm-surface-sel text-adm-ink-500'
            }
          />
        </div>
        <OfferStatusBadge row={row} />
      </div>

      <div className="flex items-center gap-1.5 border-t border-adm-line-div pt-3 lg:border-t-0 lg:pt-0">
        <Button
          type="button"
          variant="admin-outline"
          size="xs"
          icon={<Pencil size={13} />}
          aria-label={`Editar ${row.name}`}
          onClick={onEdit}
        >
          Editar
        </Button>
        <Button
          type="button"
          variant={row.active ? 'admin-ghost' : 'admin-outline'}
          size="xs"
          icon={busy ? undefined : <Power size={13} />}
          disabled={busy}
          onClick={onToggleActive}
        >
          {busy ? 'Guardando…' : row.active ? 'Desactivar' : 'Activar'}
        </Button>
      </div>
    </div>
  );
}

export default ServiceRow;
