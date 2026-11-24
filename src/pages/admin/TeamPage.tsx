import { useMemo, useState, type FormEvent } from 'react';
import { ArrowRight, Mail, MapPin, Plus, Power, UsersRound } from 'lucide-react';
import SectionTitle from '../../components/common/SectionTitle';
import { getInitials } from '../../utils/format';
import Button from '../../components/common/Button';
import EmptyState from '../../components/common/EmptyState';
import Spinner from '../../components/common/Spinner';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import StatusBadge from '../../components/common/StatusBadge';
import FormError from '../../components/common/FormError';
import MemberBranchesModal from '../../components/team/MemberBranchesModal';
import { useAuth } from '../../hooks/useAuth';
import { useTeamMembers } from '../../hooks/useTeamMembers';
import { useAdminBranches } from '../../hooks/useAdminBranches';
import { useManageableBranchIds } from '../../hooks/useManageableBranchIds';
import {
  EMAIL_TAKEN_MESSAGE,
  inviteInternalUser,
  setProfileActive,
  type TeamMember,
} from '../../services/teamService';
import { accountAction } from '../../utils/teamAccounts';
import { setProfessionalBranchActive } from '../../services/professionalService';
import { PROFESSIONAL_ROLES } from '../../services/professionalService';
import type { AppRole } from '../../types/User';

const roleLabels: Record<AppRole, string> = {
  admin_global: 'Administrador global',
  admin_sede: 'Administrador de sede',
  especialista: 'Especialista',
  odontologa_general: 'Odontóloga general',
  tecnica: 'Técnica',
};

// admin_global no se crea desde la app: se crea desde Supabase (README).
const rolesAdminGlobalCanCreate: AppRole[] = ['admin_sede', 'especialista', 'odontologa_general', 'tecnica'];
const rolesAdminSedeCanCreate: AppRole[] = ['especialista', 'odontologa_general', 'tecnica'];

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
  // null = admin_global (todas las sedes).
  const { branchIds: manageableBranchIds } = useManageableBranchIds();
  const canManageBranch = (branchId: string) => manageableBranchIds === null || manageableBranchIds.includes(branchId);
  // Sedes editables en Equipo: técnicas y administradoras de sede (admin_global);
  // solo técnicas (admin_sede). Las de una profesional van en Profesionales.
  const canEditBranches = (member: TeamMember) =>
    !member.branchesFromProfessionals &&
    (member.role === 'tecnica' || (isAdminGlobal && member.role === 'admin_sede'));
  const actionFor = (member: TeamMember) =>
    accountAction(member, { isAdminGlobal, myBranchIds: manageableBranchIds, selfId: user?.id });
  const [editingBranches, setEditingBranches] = useState<TeamMember | null>(null);
  const [toggleError, setToggleError] = useState<string | null>(null);

  const { members, isLoading, error, refetch } = useTeamMembers();
  const { branches, isLoading: isLoadingBranches, error: branchesError } = useAdminBranches();

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

  // Una administradora de sede administra una sola sede: se elige con radio.
  const isSingleBranchRole = form.role === 'admin_sede';

  const toggleBranch = (branchId: string) => {
    setForm((current) => ({
      ...current,
      branchIds:
        current.role === 'admin_sede'
          ? [branchId]
          : current.branchIds.includes(branchId)
            ? current.branchIds.filter((id) => id !== branchId)
            : [...current.branchIds, branchId],
    }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);

    // Una persona = una cuenta. La Edge Function lo revisa también (aquí solo
    // se ven los correos que la RLS deja leer).
    const email = form.email.trim().toLowerCase();
    if (members.some((member) => member.email.toLowerCase() === email)) {
      setFormError(EMAIL_TAKEN_MESSAGE);
      return;
    }

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

  const handleToggleActive = async (memberId: string, nextActive: boolean, branchId?: string) => {
    setTogglingId(memberId);
    setToggleError(null);
    try {
      await (branchId
        ? setProfessionalBranchActive(memberId, branchId, nextActive)
        : setProfileActive(memberId, nextActive));
      refetch();
    } catch (err) {
      setToggleError(err instanceof Error ? err.message : 'No se pudo actualizar la cuenta.');
    } finally {
      setTogglingId(null);
    }
  };

  // Una admin_sede solo invita en sus sedes.
  const invitableBranches = activeBranches.filter((branch) => canManageBranch(branch.id));

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

      <FormError message={toggleError} />

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
          description="Invita a la primera cuenta de administrador de sede, especialista, odontóloga general o técnica."
        />
      ) : (
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
          {members.map((member) => (
            <div
              key={member.id}
              className="flex h-full flex-col rounded-[14px] border border-adm-line-card bg-white p-5 shadow-soft transition-shadow duration-[180ms] hover:border-[#d7e2e6] hover:shadow-adm-elev-1"
            >
              <div className="flex flex-1 flex-col gap-3.5">
                <div className="flex items-center gap-3">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#dceef0] text-sm font-semibold text-adm-accent-deep">
                    {getInitials(member.fullName)}
                  </span>
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <p className="truncate text-[15.5px] font-semibold text-adm-ink-700" title={member.fullName}>
                      {member.fullName}
                    </p>
                    <p className="flex min-w-0 items-center gap-1.5 text-[13px] text-adm-ink-400">
                      <Mail size={13} className="shrink-0" />
                      <span className="truncate" title={member.email}>{member.email}</span>
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <StatusBadge label={roleLabels[member.role]} tone="brand" />
                  <StatusBadge label={member.active ? 'Activo' : 'Inactivo'} tone={member.active ? 'adm-active' : 'adm-inactive'} />
                </div>

                <div className="flex items-start gap-1.5">
                  <MapPin size={14} strokeWidth={1.75} className="mt-px shrink-0 text-adm-ink-300" />
                  <div className="flex flex-col gap-0.5">
                    <p className="text-[13px] leading-snug text-adm-ink-400">
                      {member.branchNames.length === 0
                        ? 'Sin sedes todavía'
                        : member.branchesFromProfessionals
                          ? member.branchNames
                              .map((name, index) =>
                                member.inactiveBranchIds.includes(member.branchIds[index]) ? `${name} (desactivada)` : name,
                              )
                              .join(', ')
                          : member.branchNames.join(', ')}
                    </p>
                    {member.branchesFromProfessionals && (
                      <p className="text-[12px] italic text-adm-ink-300">Se asignan en Profesionales</p>
                    )}
                  </div>
                </div>
              </div>

              {(() => {
                const action = actionFor(member);
                const isBusy = togglingId === member.id;
                const branchName =
                  action.kind === 'branch'
                    ? (branches.find((branch) => branch.id === action.branchId)?.name ?? 'tu sede')
                    : '';

                const secondary = member.branchesFromProfessionals ? (
                  <Button
                    to={`/admin/profesionales?ficha=${member.id}`}
                    variant="admin-outline"
                    size="md"
                    icon={<ArrowRight size={14} />}
                    className="w-full"
                  >
                    Ver ficha
                  </Button>
                ) : canEditBranches(member) ? (
                  <Button
                    type="button"
                    variant="admin-outline"
                    size="md"
                    icon={<MapPin size={14} />}
                    className="w-full"
                    onClick={() => setEditingBranches(member)}
                  >
                    Editar sedes
                  </Button>
                ) : null;

                const toggle =
                  action.kind === 'branch' ? (
                    <Button
                      type="button"
                      variant={action.active ? 'admin-danger' : 'admin-outline'}
                      size="md"
                      icon={<Power size={14} />}
                      className="w-full"
                      disabled={isBusy}
                      onClick={() => handleToggleActive(member.id, !action.active, action.branchId)}
                    >
                      {isBusy ? 'Guardando…' : `${action.active ? 'Desactivar' : 'Activar'} en ${branchName}`}
                    </Button>
                  ) : action.kind === 'account' ? (
                    <Button
                      type="button"
                      variant={member.active ? 'admin-danger' : 'admin-outline'}
                      size="md"
                      icon={<Power size={14} />}
                      className="w-full"
                      disabled={isBusy || action.blockedReason !== null}
                      onClick={() => handleToggleActive(member.id, !member.active)}
                    >
                      {isBusy ? 'Guardando…' : member.active ? 'Desactivar' : 'Activar'}
                    </Button>
                  ) : null;

                const hint =
                  action.kind === 'branch'
                    ? action.active
                      ? `Atiende en varias sedes: solo deja de salir en la reserva de ${branchName}.`
                      : `Desactivada en ${branchName}: no sale en su reserva. Conserva su horario y servicios.`
                    : action.kind === 'account'
                      ? action.blockedReason
                      : null;

                if (!secondary && !toggle) return null;
                return (
                  <div className="mt-4 flex flex-col gap-2 border-t border-adm-line-div pt-4">
                    {secondary}
                    {toggle}
                    {hint && <p className="text-[12px] leading-snug text-adm-ink-400">{hint}</p>}
                  </div>
                );
              })()}
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Invitar usuario interno"
        footer={
          <>
            <Button type="button" variant="admin-outline" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="equipo-form" variant="admin-solid" disabled={isSubmitting}>
              {isSubmitting ? 'Enviando…' : 'Enviar invitación'}
            </Button>
          </>
        }
      >
        <form id="equipo-form" onSubmit={handleSubmit} className="flex flex-col gap-4 py-2">
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
            onChange={(event) => {
              const role = event.target.value as AppRole;
              // Al pasar a administradora de sede queda como mucho una sede.
              setForm((current) => ({
                ...current,
                role,
                branchIds: role === 'admin_sede' ? current.branchIds.slice(0, 1) : current.branchIds,
              }));
            }}
            options={assignableRoles.map((role) => ({ value: role, label: roleLabels[role] }))}
          />

          {(
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-adm-ink-700">
                {PROFESSIONAL_ROLES.includes(form.role)
                  ? 'Sedes donde atiende'
                  : isSingleBranchRole
                    ? 'Sede que administra'
                    : 'Sedes asignadas'}
              </span>
              {PROFESSIONAL_ROLES.includes(form.role) && (
                <p className="text-xs leading-relaxed text-adm-ink-400">
                  Se crea con su ficha en estas sedes. Después, sus servicios, horario y otras sedes se asignan en
                  Profesionales.
                </p>
              )}
              {isLoadingBranches ? (
                <Spinner size={20} />
              ) : branchesError ? (
                <p className="text-sm text-adm-danger-text">{branchesError}</p>
              ) : invitableBranches.length === 0 ? (
                <p className="text-sm text-adm-ink-400">No hay sedes activas registradas todavía.</p>
              ) : (
                <div className="flex flex-col gap-1.5 rounded-[10px] border border-adm-line-field p-3">
                  {invitableBranches.map((branch) => (
                    <label key={branch.id} className="flex items-center gap-2 text-sm text-adm-ink-700">
                      <input
                        type={isSingleBranchRole ? 'radio' : 'checkbox'}
                        name="equipo-sede"
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
        </form>
      </Modal>

      {editingBranches && (
        <MemberBranchesModal
          member={editingBranches}
          branches={branches}
          canManageBranch={canManageBranch}
          onClose={() => setEditingBranches(null)}
          onSaved={() => {
            setEditingBranches(null);
            refetch();
          }}
        />
      )}
    </div>
  );
}

export default TeamPage;
