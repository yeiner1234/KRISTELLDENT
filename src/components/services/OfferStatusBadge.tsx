import StatusBadge from '../common/StatusBadge';
import type { ServiceOfferStatus } from '../../types/Offer';

// Estado de un servicio en la reserva: inactivo, visible, o el motivo por el
// que un servicio activo no se ve (lo calcula get_branch_offer_status).
function OfferStatusBadge({ row }: { row: ServiceOfferStatus }) {
  if (!row.active) return <StatusBadge label="Inactivo" tone="adm-inactive" />;
  if (row.bookable) return <StatusBadge label="Visible en reservas" tone="adm-active" />;
  return <span className="block max-w-[260px] whitespace-normal text-[12.5px] text-adm-danger-text">{row.reason}</span>;
}

export default OfferStatusBadge;
