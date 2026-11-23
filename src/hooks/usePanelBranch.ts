import { useContext } from 'react';
import { PanelBranchContext, type PanelBranchContextValue } from '../context/panelBranchContext';

// Sede elegida en el selector del panel profesional. Fuera del panel devuelve
// "todas" y no filtra.
export function usePanelBranch(): PanelBranchContextValue {
  return useContext(PanelBranchContext);
}
