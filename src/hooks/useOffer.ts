import { useCallback, useEffect, useState } from 'react';
import {
  getBranchOfferStatus,
  getOfferOverview,
  getSpecialtiesAdmin,
} from '../services/offerService';
import { getServicesWithoutBranch } from '../services/serviceService';
import type { AdminSpecialty, OfferOverviewCell, ServiceOfferStatus } from '../types/Offer';
import type { Service } from '../types/Service';

interface LoadResult<T> {
  data: T;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

// Carga con estado y recarga a pedido. `key` cambia cuando cambia lo que se
// pide (p. ej. la sede); con key null no se carga nada.
function useLoad<T>(key: string | null, load: () => Promise<T>, empty: T, fallbackError: string): LoadResult<T> {
  const [state, setState] = useState<{ key: string | null; data: T; error: string | null }>({
    key: null,
    data: empty,
    error: null,
  });
  const [reloadKey, setReloadKey] = useState(0);
  const requestKey = key === null ? null : `${key}|${reloadKey}`;

  useEffect(() => {
    if (requestKey === null) return;
    let isMounted = true;
    load()
      .then((data) => isMounted && setState({ key: requestKey, data, error: null }))
      .catch((err) =>
        isMounted && setState({ key: requestKey, data: empty, error: err instanceof Error ? err.message : fallbackError }),
      );
    return () => {
      isMounted = false;
    };
    // load y empty cambian en cada render; requestKey dice cuándo recargar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey]);

  const refetch = useCallback(() => setReloadKey((current) => current + 1), []);
  const isCurrent = state.key === requestKey;

  return {
    data: isCurrent ? state.data : empty,
    isLoading: requestKey !== null && !isCurrent,
    error: isCurrent ? state.error : null,
    refetch,
  };
}

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
