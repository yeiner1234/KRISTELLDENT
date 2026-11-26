import { useLoad } from './useLoad';
import { getBranchOfferStatus, getSpecialtiesAdmin } from '../services/offerService';
import type { AdminSpecialty, ServiceOfferStatus } from '../types/Offer';

const NO_STATUS: ServiceOfferStatus[] = [];
const NO_SPECIALTIES: AdminSpecialty[] = [];

export function useBranchOfferStatus(branchId: string | null) {
  return useLoad(
    branchId,
    () => getBranchOfferStatus(branchId ?? ''),
    NO_STATUS,
    'No se pudieron cargar los servicios de la sede.',
  );
}

export function useSpecialtiesAdmin() {
  return useLoad('specialties', getSpecialtiesAdmin, NO_SPECIALTIES, 'No se pudieron cargar las especialidades.');
}
