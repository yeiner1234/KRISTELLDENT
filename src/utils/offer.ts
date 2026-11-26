import type { OfferProfessional, ServiceOfferStatus } from '../types/Offer';

// Por qué una profesional asignada no hace visible el servicio en la reserva.
export function professionalLabel(professional: OfferProfessional): string {
  if (!professional.accountActive) return `${professional.fullName} (cuenta desactivada en Equipo)`;
  if (!professional.recordActive) return `${professional.fullName} (ficha desactivada)`;
  if (!professional.branchActive) return `${professional.fullName} (desactivada en esta sede)`;
  if (!professional.active) return `${professional.fullName} (desactivada)`;
  if (!professional.hasSchedule) return `${professional.fullName} (sin horario aquí)`;
  return professional.fullName;
}

export function professionalNames(row: ServiceOfferStatus): string {
  return row.professionals.length > 0 ? row.professionals.map(professionalLabel).join(', ') : '—';
}
