import { useCallback, useEffect, useState } from 'react';

export interface LoadResult<T> {
  data: T;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

// Carga con estado y recarga a pedido. `key` identifica lo que se pide (p. ej.
// la sede): al cambiar, se vuelve a cargar; con key null no se carga nada.
// Mientras el resultado guardado es de otra key, se reporta como cargando.
export function useLoad<T>(key: string | null, load: () => Promise<T>, empty: T, fallbackError: string): LoadResult<T> {
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
      .catch(
        (err) =>
          isMounted &&
          setState({ key: requestKey, data: empty, error: err instanceof Error ? err.message : fallbackError }),
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
