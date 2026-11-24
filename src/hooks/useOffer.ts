import { useLoad } from './useLoad';
import {
  getBranchOfferStatus,
  getOfferOverview,
  getSpecialtiesAdmin,
} from '../services/offerService';
import { getServicesWithoutBranch } from '../services/serviceService';
import type { AdminSpecialty, OfferOverviewCell, ServiceOfferStatus } from '../types/Offer';
import type { Service } from '../types/Service';

const NO_STATUS: ServiceOfferStatus[] = [];
const NO_CELLS: OfferOverviewCell[] = [];
const NO_SPECIALTIES: AdminSpecialty[] = [];
const NO_SERVICES: Service[] = [];

export function useBranchOfferStatus(branchId: string | null) {
  return useLoad(
    branchId,
    () => getBranchOfferStatus(branchId ?? ''),
    NO_STATUS,
    'No se pudieron cargar los servicios de la sede.',
  );
}

// Estado de la oferta de varias sedes a la vez (supervisión global).
export function useOfferStatusOfBranches(branchIds: string[]) {
  const key = branchIds.length > 0 ? branchIds.join(',') : null;
  return useLoad(
    key,
    async () => {
      const lists = await Promise.all(branchIds.map((branchId) => getBranchOfferStatus(branchId)));
      return lists.flatMap((list, index) => list.map((row) => ({ ...row, branchId: branchIds[index] })));
    },
    [] as (ServiceOfferStatus & { branchId: string })[],
    'No se pudieron cargar los servicios.',
  );
}

export function useOfferOverview(enabled: boolean) {
  return useLoad(enabled ? 'overview' : null, getOfferOverview, NO_CELLS, 'No se pudo cargar la oferta por sede.');
}

export function useSpecialtiesAdmin() {
  return useLoad('specialties', getSpecialtiesAdmin, NO_SPECIALTIES, 'No se pudieron cargar las especialidades.');
}

export function useServicesWithoutBranch(enabled: boolean) {
  return useLoad(
    enabled ? 'without-branch' : null,
    getServicesWithoutBranch,
    NO_SERVICES,
    'No se pudieron cargar los servicios sin sede.',
  );
}
