import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { PanelBranchContext, type PanelBranchContextValue } from './panelBranchContext';
import { useAuth } from '../hooks/useAuth';
import { useBranches } from '../hooks/useBranches';
import { getMyPanelBranches, type MyPanelBranches } from '../services/myBranchesService';
import { dayOfWeekOf, defaultPanelBranch } from '../utils/panelBranch';
import { getTodayIsoDate } from '../utils/date';

// "Todas mis sedes" se guarda con su propio valor para distinguirlo de "no
// eligió nada en esta sesión" (que usa la sede por defecto).
const ALL = '__todas__';

function storageKey(userId: string): string {
  return `kd.panelBranch.${userId}`;
}

// sessionStorage puede fallar (modo privado, bloqueado): el panel sigue igual.
function readStored(userId: string): string | null {
  try {
    return sessionStorage.getItem(storageKey(userId));
  } catch {
    return null;
  }
}

function writeStored(userId: string, value: string): void {
  try {
    sessionStorage.setItem(storageKey(userId), value);
  } catch {
    // Sin almacenamiento la elección dura hasta recargar.
  }
}

function PanelBranchProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? '';
  const role = user?.role ?? 'especialista';
  const { branches: activeBranches, isLoading: isLoadingBranches } = useBranches();
  const [mine, setMine] = useState<MyPanelBranches | null>(null);
  const [chosen, setChosen] = useState<string | null>(() => (userId ? readStored(userId) : null));

  useEffect(() => {
    if (!userId) return;
    let isMounted = true;
    getMyPanelBranches(userId, role, dayOfWeekOf(getTodayIsoDate()))
      .then((data) => {
        if (isMounted) setMine(data);
      })
      // Sin sus sedes no hay selector: el panel muestra todas sus citas.
      .catch(() => {
        if (isMounted) setMine({ branchIds: [], todayBranchIds: [] });
      });
    return () => {
      isMounted = false;
    };
  }, [userId, role]);

  const branches = useMemo(
    () =>
      activeBranches
        .filter((branch) => mine?.branchIds.includes(branch.id))
        .map((branch) => ({ id: branch.id, name: branch.name })),
    [activeBranches, mine],
  );

  const nameById = useMemo(() => new Map(activeBranches.map((branch) => [branch.id, branch.name])), [activeBranches]);
  const branchName = useCallback((branchId: string) => nameById.get(branchId) ?? '—', [nameById]);

  const isLoading = mine === null || isLoadingBranches;
  const branchIds = branches.map((branch) => branch.id);
  // Con una sola sede no hay nada que elegir: se muestran todas sus citas.
  let selectedBranchId = '';
  if (!isLoading && branches.length > 1) {
    if (chosen === ALL) selectedBranchId = '';
    else if (chosen && branchIds.includes(chosen)) selectedBranchId = chosen;
    else selectedBranchId = defaultPanelBranch(branchIds, mine?.todayBranchIds ?? []);
  }

  const setSelectedBranchId = useCallback(
    (branchId: string) => {
      const value = branchId || ALL;
      setChosen(value);
      if (userId) writeStored(userId, value);
    },
    [userId],
  );

  const value: PanelBranchContextValue = {
    branches,
    selectedBranchId,
    setSelectedBranchId,
    branchName,
    isLoading,
    inPanel: true,
  };

  return <PanelBranchContext.Provider value={value}>{children}</PanelBranchContext.Provider>;
}

export default PanelBranchProvider;
