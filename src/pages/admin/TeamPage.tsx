import { useMemo, useState, type FormEvent } from 'react';
import { Mail, Plus, UsersRound } from 'lucide-react';
import SectionTitle from '../../components/common/SectionTitle';
import Button from '../../components/common/Button';
import EmptyState from '../../components/common/EmptyState';
import Spinner from '../../components/common/Spinner';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import StatusBadge from '../../components/common/StatusBadge';
import { useAuth } from '../../hooks/useAuth';
import { useTeamMembers } from '../../hooks/useTeamMembers';
import { useAdminBranches } from '../../hooks/useAdminBranches';
import { inviteInternalUser, setProfileActive } from '../../services/teamService';
import type { AppRole } from '../../types/User';

const roleLabels: Record<AppRole, string> = {
  admin_global: 'Administrador global',
  admin_sede: 'Administrador de sede',
  especialista: 'Especialista',
  tecnica: 'Técnica',
};

const rolesAdminGlobalCanCreate: AppRole[] = ['admin_global', 'admin_sede', 'especialista', 'tecnica'];
const rolesAdminSedeCanCreate: AppRole[] = ['especialista', 'tecnica'];

interface FormState {
  fullName: string;
  email: string;
  role: AppRole;
  branchIds: string[];
}

function TeamPage() {
  const { user } = useAuth();
  const isAdminGlobal = user?.role === 'admin_global';
  const assignableRoles = isAdminGlobal ? rolesAdminGlobalCanCreate : rolesAdminSedeCanCreate;

  const { members, isLoading, error, refetch } = useTeamMembers();
  const { branches, isLoading: isLoadingBranches } = useAdminBranches();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>({
    fullName: '',
    email: '',
    role: assignableRoles[0],
    branchIds: [],
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const activeBranches = useMemo(() => branches.filter((branch) => branch.active), [branches]);

  const openModal = () => {
    setForm({ fullName: '', email: '', role: assignableRoles[0], branchIds: [] });
    setFormError(null);
    setIsModalOpen(true);
  };

  const toggleBranch = (branchId: string) => {
    setForm((current) => ({
      ...current,
      branchIds: current.branchIds.includes(branchId)
        ? current.branchIds.filter((id) => id !== branchId)
        : [...current.branchIds, branchId],
    }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      await inviteInternalUser({
        email: form.email.trim(),
        fullName: form.fullName.trim(),
        role: form.role,
        branchIds: form.branchIds,
      });
      setIsModalOpen(false);
      setSuccessMessage(`Invitación enviada a ${form.email.trim()}.`);
      refetch();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'No se pudo crear el usuario.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (memberId: string, nextActive: boolean) => {
    setTogglingId(memberId);
    try {
      await setProfileActive(memberId, nextActive);
      refetch();
    } finally {
      setTogglingId(null);
    }
  };

  const needsBranches = form.role !== 'admin_global';

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionTitle title="Equipo" align="left" />
        <Button type="button" variant="admin-solid" size="sm" icon={<Plus size={16} />} onClick={openModal}>
          Invitar usuario
        </Button>
      </div>

      {successMessage && (
        <p className="rounded-[10px] border border-adm-status-confirmed-border bg-adm-status-confirmed-bg px-3.5 py-2.5 text-sm font-medium text-adm-status-confirmed-text">
          {successMessage}
        </p>
      )}

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Spinner size={28} />
        </div>
      ) : error ? (
        <EmptyState icon={UsersRound} title="No se pudo cargar el equipo" description={error} />
      ) : members.length === 0 ? (
        <EmptyState
          icon={UsersRound}
          title="No hay usuarios internos registrados"
          description="Invita a la primera cuenta de administrador de sede, especialista o técnica."
        />
      ) : (
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
          {members.map((member) => (
            <div
              key={member.id}
              className="flex flex-col gap-3 rounded-[14px] border border-adm-line-card bg-white p-5 shadow-soft"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 flex-col">
                  <p className="truncate text-[15.5px] font-semibold text-adm-ink-700">{member.fullName}</p>
                  <p className="flex items-center gap-1.5 truncate text-[13px] text-adm-ink-400">
                    <Mail size={13} />
                    {member.email}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <StatusBadge label={roleLabels[member.role]} tone="brand" />
                <StatusBadge label={member.active ? 'Activo' : 'Inactivo'} tone={member.active ? 'adm-active' : 'adm-inactive'} />
              </div>

              {member.branchNames.length > 0 && (
                <p className="text-[13px] text-adm-ink-400">{member.branchNames.join(', ')}</p>
              )}

              {isAdminGlobal && member.id !== user?.id && (
                <div className="border-t border-adm-line-div pt-3">
                  <Button
                    type="button"
                    variant={member.active ? 'admin-danger' : 'admin-outline'}
                    size="xs"
                    className="w-full"
                    disabled={togglingId === member.id}
                    onClick={() => handleToggleActive(member.id, !member.active)}
                  >
                    {togglingId === member.id ? 'Guardando…' : member.active ? 'Desactivar' : 'Activar'}
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Invitar usuario interno">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 py-2">
          {formError && (
            <p className="rounded-[10px] border border-adm-status-cancelled-border bg-adm-status-cancelled-bg px-3.5 py-2.5 text-sm font-medium text-adm-danger-text">
              {formError}
            </p>
          )}

          <Input
            label="Nombre completo"
            name="fullName"
            variant="admin"
            value={form.fullName}
            onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))}
            required
          />
          <Input
            label="Correo electrónico"
            name="email"
            type="email"
            variant="admin"
            value={form.email}
            onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
            required
          />
          <Select
            label="Rol"
            value={form.role}
            onChange={(event) => setForm((current) => ({ ...current, role: event.target.value as AppRole }))}
            options={assignableRoles.map((role) => ({ value: role, label: roleLabels[role] }))}
          />

          {needsBranches && (
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-adm-ink-700">Sedes asignadas</span>
              {isLoadingBranches ? (
                <Spinner size={20} />
              ) : activeBranches.length === 0 ? (
                <p className="text-sm text-adm-ink-400">No hay sedes activas registradas todavía.</p>
              ) : (
                <div className="flex flex-col gap-1.5 rounded-[10px] border border-adm-line-field p-3">
                  {activeBranches.map((branch) => (
                    <label key={branch.id} className="flex items-center gap-2 text-sm text-adm-ink-700">
                      <input
                        type="checkbox"
                        className="h-[15px] w-[15px] accent-brand-600"
                        checked={form.branchIds.includes(branch.id)}
                        onChange={() => toggleBranch(branch.id)}
                      />
                      {branch.name}
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          <p className="text-xs leading-relaxed text-adm-ink-400">
            Se le enviará un correo de invitación para que defina su propia contraseña. No se comparte ninguna
            contraseña desde este panel.
          </p>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="admin-outline" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="admin-solid" disabled={isSubmitting}>
              {isSubmitting ? 'Enviando…' : 'Enviar invitación'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default TeamPage;
