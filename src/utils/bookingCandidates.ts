import type { Professional } from '../types/Professional';

// Valor de professionalId cuando el paciente elige "cualquier profesional".
export const ANY_PROFESSIONAL = 'any';

// Quién puede atender la reserva: tiene la especialidad Y atiende en la sede.
export function professionalsForBooking(
  professionals: Professional[],
  specialtyId: string,
  branchId: string,
): Professional[] {
  return professionals.filter(
    (professional) => professional.specialtyIds.includes(specialtyId) && professional.branchIds.includes(branchId),
  );
}

interface CandidateQuery {
  specialtyId: string;
  branchId: string;
  professionalId: string;
}

export function candidateProfessionals(professionals: Professional[], query: CandidateQuery): Professional[] {
  const eligible = professionalsForBooking(professionals, query.specialtyId, query.branchId);
  return query.professionalId === ANY_PROFESSIONAL
    ? eligible
    : eligible.filter((professional) => professional.id === query.professionalId);
}
