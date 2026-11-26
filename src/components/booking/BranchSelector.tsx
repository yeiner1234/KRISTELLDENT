import { Check, Clock, MapPin } from 'lucide-react';
import { useBranches } from '../../hooks/useBranches';
import { useBranchOpenStatus } from '../../hooks/useBranchOpenStatus';
import EmptyState from '../common/EmptyState';
import Spinner from '../common/Spinner';
import type { Branch } from '../../types/Branch';

interface BranchSelectorProps {
  selectedId: string | null;
  onSelect: (branchId: string) => void;
}

function BranchSelector({ selectedId, onSelect }: BranchSelectorProps) {
  const { branches, isLoading, error } = useBranches();

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Spinner size={26} />
      </div>
    );
  }

  if (error) {
    return <EmptyState icon={MapPin} title={error} description="Revisa tu conexión y vuelve a intentarlo." />;
  }

  if (branches.length === 0) {
    return <EmptyState icon={MapPin} title="No hay sedes registradas" description="Aún no hay sedes disponibles para reservar." />;
  }

  return (
    <div className="grid gap-2.5 sm:grid-cols-2 sm:gap-3">
      {branches.map((branch) => (
        <BranchOption
          key={branch.id}
          branch={branch}
          isSelected={branch.id === selectedId}
          onSelect={() => onSelect(branch.id)}
        />
      ))}
    </div>
  );
}

interface BranchOptionProps {
  branch: Branch;
  isSelected: boolean;
  onSelect: () => void;
}

function BranchOption({ branch, isSelected, onSelect }: BranchOptionProps) {
  const { isOpen, todayLabel } = useBranchOpenStatus(branch.id);

  // Fila compacta: en celular caben varias sedes sin bajar tanto.
  return (
    <button
      type="button"
      aria-pressed={isSelected}
      onClick={onSelect}
      className={`flex w-full items-start gap-3.5 rounded-2xl border p-4 text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 ${
        isSelected
          ? 'border-brand-600 bg-[#f5fafb] shadow-[0_0_0_3px_#e6f3f5]'
          : 'border-[#e1e8ec] bg-white hover:border-[#b8d7dc] hover:bg-[#fbfdfd]'
      }`}
    >
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors ${
          isSelected ? 'bg-brand-600 text-white' : 'bg-brand-50 text-brand-700'
        }`}
      >
        {isSelected ? <Check size={20} strokeWidth={2.5} /> : <MapPin size={19} />}
      </span>

      <span className="flex min-w-0 flex-1 flex-col">
        <span className="flex items-start justify-between gap-2">
          <span className="text-[15px] font-semibold leading-snug text-brand-900">{branch.name}</span>
          <span
            className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
              isOpen ? 'border-[#c6e7d5] bg-confirm-bg text-confirm' : 'border-[#e1e8ec] bg-[#f2f5f7] text-ink-tertiary'
            }`}
          >
            {isOpen ? 'Abierta' : 'Cerrada'}
          </span>
        </span>
        <span className="mt-0.5 text-[13.5px] leading-snug text-ink-secondary">
          {branch.address}
          {branch.region && <span className="text-ink-tertiary"> · {branch.region}</span>}
        </span>
        <span className="mt-1.5 inline-flex items-center gap-1.5 text-[12.5px] text-ink-tertiary">
          <Clock size={13} aria-hidden="true" />
          {todayLabel}
        </span>
      </span>
    </button>
  );
}

export default BranchSelector;
