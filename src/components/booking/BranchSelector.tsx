import { MapPin } from 'lucide-react';
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
  const { branches, isLoading } = useBranches();

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Spinner size={26} />
      </div>
    );
  }

  if (branches.length === 0) {
    return <EmptyState icon={MapPin} title="No hay sedes registradas" description="Aún no hay sedes disponibles para reservar." />;
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
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

  return (
    <button
      type="button"
      aria-pressed={isSelected}
      onClick={onSelect}
      className="rounded-2xl p-4 text-left transition-colors"
      style={{
        border: isSelected ? '1.5px solid #0f7b86' : '1px solid #e1e8ec',
        background: isSelected ? '#f5fafb' : '#ffffff',
        boxShadow: isSelected ? '0 0 0 3px #e6f3f5' : 'none',
      }}
      onMouseEnter={(event) => {
        if (!isSelected) {
          event.currentTarget.style.borderColor = '#b8d7dc';
          event.currentTarget.style.background = '#fbfdfd';
        }
      }}
      onMouseLeave={(event) => {
        if (!isSelected) {
          event.currentTarget.style.borderColor = '#e1e8ec';
          event.currentTarget.style.background = '#ffffff';
        }
      }}
    >
      <div className="flex items-start justify-between">
        <span className="flex h-[38px] w-[38px] items-center justify-center rounded-[11px] bg-brand-50 text-brand-700">
          <MapPin size={18} />
        </span>
        <span
          className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
          style={
            isOpen
              ? { background: 'var(--color-confirm-bg)', color: 'var(--color-confirm)', border: '1px solid #c6e7d5' }
              : { background: '#f2f5f7', color: '#5d7078', border: '1px solid #e1e8ec' }
          }
        >
          {isOpen ? 'Abierta' : 'Cerrada'}
        </span>
      </div>

      <p className="mt-3 text-base font-semibold text-brand-900">{branch.name}</p>
      <p className="mt-0.5 text-sm text-ink-secondary">{branch.address}</p>
      {branch.region && <p className="text-sm text-ink-secondary">{branch.region}</p>}

      <p className="mt-2 text-[12.5px] text-ink-tertiary">{todayLabel}</p>
    </button>
  );
}

export default BranchSelector;
