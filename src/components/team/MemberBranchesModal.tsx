import { useState } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import FormError from '../common/FormError';
import { setMemberBranches, type TeamMember } from '../../services/teamService';

interface MemberBranchesModalProps {
  member: TeamMember;
  branches: { id: string; name: string; active: boolean }[];
  canManageBranch: (branchId: string) => boolean;
  onClose: () => void;
  onSaved: () => void;
}

// Sedes de una técnica o administradora de sede ya creada. Una admin_sede solo
// marca o desmarca sus sedes; las demás se ven sin poder cambiarlas.
function MemberBranchesModal({ member, branches, canManageBranch, onClose, onSaved }: MemberBranchesModalProps) {
  const [selected, setSelected] = useState(member.branchIds);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const visible = branches.filter((branch) => branch.active || member.branchIds.includes(branch.id));

  const handleSave = async () => {
    if (selected.length === 0) {
      setError('Deja al menos una sede.');
      return;
    }
    setError(null);
    setIsSaving(true);
    try {
      await setMemberBranches(member.id, selected, member.branchIds);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron guardar las sedes.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={`Sedes de ${member.fullName}`}
      footer={
        <>
          <Button type="button" variant="admin-outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="button" variant="admin-solid" disabled={isSaving} onClick={handleSave}>
            {isSaving ? 'Guardando…' : 'Guardar sedes'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3 py-2">
        <FormError message={error} />
        <div className="flex flex-col gap-1.5 rounded-[10px] border border-adm-line-field p-3">
          {visible.map((branch) => {
            const editable = canManageBranch(branch.id);
            return (
              <label key={branch.id} className="flex items-center gap-2 text-sm text-adm-ink-700">
                <input
                  type="checkbox"
                  className="h-[15px] w-[15px] accent-brand-600"
                  disabled={!editable}
                  checked={selected.includes(branch.id)}
                  onChange={() =>
                    setSelected((current) =>
                      current.includes(branch.id) ? current.filter((id) => id !== branch.id) : [...current, branch.id],
                    )
                  }
                />
                {branch.name}
                {!editable && <span className="text-[12px] text-adm-ink-300">(no la administras)</span>}
              </label>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}

export default MemberBranchesModal;
