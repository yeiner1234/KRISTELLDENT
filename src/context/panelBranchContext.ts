import { createContext } from 'react';

export interface PanelBranchOption {
  id: string;
  name: string;
}

export interface PanelBranchContextValue {
  // Sedes activas de la persona con sesión, por nombre.
  branches: PanelBranchOption[];
  // '' = "Todas mis sedes".
  selectedBranchId: string;
  setSelectedBranchId: (branchId: string) => void;
  // Nombre de cualquier sede activa ('—' si no se conoce).
  branchName: (branchId: string) => string;
  isLoading: boolean;
  // false fuera del panel profesional (p. ej. la agenda imprimible en /admin).
  inPanel: boolean;
}

export const PanelBranchContext = createContext<PanelBranchContextValue>({
  branches: [],
  selectedBranchId: '',
  setSelectedBranchId: () => {},
  branchName: () => '—',
  isLoading: false,
  inPanel: false,
});
