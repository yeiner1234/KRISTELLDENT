import { useLoad } from './useLoad';
import { getBookableProfessionals, getBookableServices, getBranchSpecialties } from '../services/offerService';
import type { BookableProfessional, BookableService, BranchSpecialty } from '../types/Offer';

// Oferta reservable de una sede para la reserva pública (spec 8): todo sale
// de las funciones de la base, que ya filtran por servicio reservable.

const NO_SPECIALTIES: BranchSpecialty[] = [];
const NO_PROFESSIONALS: BookableProfessional[] = [];
const NO_SERVICES: BookableService[] = [];

export function useBranchSpecialties(branchId: string | null) {
  return useLoad(
    branchId,
    () => getBranchSpecialties(branchId ?? ''),
    NO_SPECIALTIES,
    'No se pudieron cargar las especialidades.',
  );
}

export function useBookableProfessionals(
  branchId: string | null,
  specialtyId: string | null,
  serviceId: string | null = null,
) {
  return useLoad(
    branchId ? `${branchId}|${specialtyId ?? ''}|${serviceId ?? ''}` : null,
    () => getBookableProfessionals({ branchId: branchId ?? '', specialtyId, serviceId }),
    NO_PROFESSIONALS,
    'No se pudieron cargar los profesionales.',
  );
}

// professionalId null = cualquier profesional.
export function useBookableServices(
  branchId: string | null,
  specialtyId: string | null,
  professionalId: string | null,
) {
  return useLoad(
    branchId ? `${branchId}|${specialtyId ?? ''}|${professionalId ?? ''}` : null,
    () => getBookableServices({ branchId: branchId ?? '', specialtyId, professionalId }),
    NO_SERVICES,
    'No se pudieron cargar los servicios.',
  );
}
