import StatusBadge from '../common/StatusBadge';
import type { ServiceOfferStatus } from '../../types/Offer';

// Estado de un servicio en la reserva pública: inactivo, visible, o no visible
// con el motivo (lo calcula get_branch_offer_status) para saber qué completar.
function OfferStatusBadge({ row }: { row: ServiceOfferStatus }) {
  if (!row.active) return <StatusBadge label="Inactivo" tone="adm-inactive" />;
  if (row.bookable) return <StatusBadge label="Visible en reservas" tone="adm-active" />;

  const detail = row.reason?.replace(/^No visible en reservas:\s*/, '') ?? '';
  return (
    <div className="flex max-w-[260px] flex-col items-start gap-1">
      <StatusBadge label="No visible en reservas" tone="adm-pending" />
      {detail && (
        <span className="whitespace-normal text-[12.5px] text-adm-ink-400">
          {detail.charAt(0).toUpperCase() + detail.slice(1)}
        </span>
      )}
    </div>
  );
}

export default OfferStatusBadge;
