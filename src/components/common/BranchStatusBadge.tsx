import { useBranchOpenStatus } from '../../hooks/useBranchOpenStatus';

interface BranchStatusBadgeProps {
  branchId: string;
  align?: 'start' | 'end';
}

function BranchStatusBadge({ branchId, align = 'end' }: BranchStatusBadgeProps) {
  const { isOpen, todayLabel } = useBranchOpenStatus(branchId);

  return (
    <div className={`flex flex-col gap-1 ${align === 'end' ? 'items-end' : 'items-start'}`}>
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
      <span className="whitespace-nowrap text-[11px] text-ink-tertiary">{todayLabel}</span>
    </div>
  );
}

export default BranchStatusBadge;
