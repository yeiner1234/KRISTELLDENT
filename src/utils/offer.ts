import type { ServiceOfferStatus } from '../types/Offer';

export function professionalNames(row: ServiceOfferStatus): string {
  return row.professionals.length > 0 ? row.professionals.map((professional) => professional.fullName).join(', ') : '—';
}
