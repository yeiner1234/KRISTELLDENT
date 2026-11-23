import { MapPin } from 'lucide-react';
import { usePanelBranch } from '../../hooks/usePanelBranch';

// Sede de una cita en el panel profesional.
function BranchTag({ branchId }: { branchId: string }) {
  const { branchName } = usePanelBranch();
  const name = branchName(branchId);

  return (
    <span
      aria-label={`Sede: ${name}`}
      className="inline-flex items-center gap-1 rounded-full bg-adm-surface-input px-2 py-0.5 text-[12px] font-medium text-adm-ink-400"
    >
      <MapPin size={12} aria-hidden="true" />
      {name}
    </span>
  );
}

export default BranchTag;
