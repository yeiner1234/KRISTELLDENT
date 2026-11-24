import { useMemo, useState } from 'react';
import { Clock, MapPinOff } from 'lucide-react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import FormError from '../common/FormError';
import StatusBadge from '../common/StatusBadge';
import {
  removeProfessionalFromBranch,
  setProfessionalActive,
  setProfessionalBranchServices,
  updateProfessionalProfile,
} from '../../services/professionalService';
import { formatCurrency } from '../../utils/format';
import { professionalStatus } from '../../utils/professionalProfile';
import type { AdminProfessional } from '../../types/Professional';
import type { Service } from '../../types/Service';
import type { Specialty } from '../../types/Specialty';

const roleLabels: Record<string, string> = {
  especialista: 'Especialista',
  odontologa_general: 'Odontóloga general',
  admin_sede: 'Administradora de sede',
  admin_global: 'Administradora global',
  tecnica: 'Técnica',
};

interface ProfessionalProfileModalProps {
  professional: AdminProfessional;
  specialties: Specialty[];
  branches: { id: string; name: string; active: boolean }[];
  services: Service[];
  isAdminGlobal: boolean;
  canManageBranch: (branchId: string) => boolean;
  onClose: () => void;
  onChanged: () => void;
  onOpenSchedule: (branchId: string) => void;
}

function toggle(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter((item) => item !== id) : [...list, id];
}

// Ficha de la profesional (spec 10.4): datos generales (valen para todas sus
// sedes) y una pestaña por sede con los servicios que atiende ahí, su horario
// y "Quitar de esta sede". Las sedes que no administra se ven en solo lectura.
function ProfessionalProfileModal({
  professional,
  specialties,
  branches,
  services,
  isAdminGlobal,
  canManageBranch,
  onClose,
  onChanged,
  onOpenSchedule,
}: ProfessionalProfileModalProps) {
  const [tab, setTab] = useState<string>('general');
  const [bio, setBio] = useState(professional.bio ?? '');
  const [specialtyIds, setSpecialtyIds] = useState(professional.specialtyIds);
  const [selectedByBranch, setSelectedByBranch] = useState<Record<string, string[]>>({});
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);

  const professionalBranches = useMemo(
    () =>
      branches
        .filter((branch) => professional.branchIds.includes(branch.id))
        .sort((a, b) => a.name.localeCompare(b.name, 'es')),
    [branches, professional.branchIds],
  );
  const activeSpecialties = specialties.filter(
    (specialty) => specialty.active || professional.specialtyIds.includes(specialty.id),
  );
  const specialtyName = (id: string) => specialties.find((specialty) => specialty.id === id)?.name ?? '—';

  const managesSomeBranch = professional.branchIds.some(canManageBranch);
  const canEditBio = isAdminGlobal || managesSomeBranch;
  // Especialista: una sola especialidad, que solo cambia admin_global (afecta
  // a todas sus sedes); admin_sede solo pone la primera. Odontóloga general:
  // admin_sede le agrega o quita especialidades (la base impide quitar una
  // que usa en otra sede).
  const isSpecialist = professional.role === 'especialista';
  const canEditSpecialties =
    isAdminGlobal ||
    (managesSomeBranch &&
      (professional.role === 'odontologa_general' || (isSpecialist && professional.specialtyIds.length === 0)));

  const run = async (action: () => Promise<void>, success: string) => {
    setError(null);
    setNotice(null);
    setIsSaving(true);
    try {
      await action();
      setNotice(success);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar.');
    } finally {
      setIsSaving(false);
    }
  };

  const saveGeneral = () =>
    run(
      () =>
        updateProfessionalProfile(
          professional.id,
          { bio: bio.trim() ? bio.trim() : null, specialtyIds },
          professional.specialtyIds,
        ),
      'Datos generales guardados.',
    );

  const branchServices = (branchId: string) => {
    const current = professional.assignments.filter((item) => item.branchId === branchId).map((item) => item.serviceId);
    // Servicios activos de esa sede y de sus especialidades, más los que ya
    // atiende (para poder quitarlos aunque ya no cumplan).
    const options = services
      .filter(
        (service) =>
          service.branchId === branchId &&
          ((service.active && professional.specialtyIds.includes(service.specialtyId)) || current.includes(service.id)),
      )
      .sort((a, b) => a.name.localeCompare(b.name, 'es'));
    return { current, options, selected: selectedByBranch[branchId] ?? current };
  };

  const currentBranch = professionalBranches.find((branch) => branch.id === tab) ?? null;

  const changeTab = (next: string) => {
    setTab(next);
    setError(null);
    setNotice(null);
    setConfirmRemove(false);
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={`Ficha — ${professional.fullName}`}
      badge={
        <StatusBadge label={professionalStatus(professional).label} tone={professionalStatus(professional).tone} />
      }
      maxWidth="max-w-[620px]"
      footer={
        <>
          {isAdminGlobal && (
            <Button
              type="button"
              variant={professional.active ? 'admin-danger' : 'admin-outline'}
              disabled={isSaving || (!professional.active && !professional.accountActive)}
              title={!professional.active && !professional.accountActive ? 'Activa primero la cuenta en Equipo.' : undefined}
              onClick={() =>
                run(
                  () => setProfessionalActive(professional.id, !professional.active),
                  professional.active ? 'Ficha desactivada.' : 'Ficha activada.',
                )
              }
            >
              {professional.active ? 'Desactivar ficha' : 'Activar ficha'}
            </Button>
          )}
          <Button type="button" variant="admin-outline" onClick={onClose}>
            Cerrar
          </Button>
        </>
      }
    >
      <div role="tablist" className="flex flex-wrap gap-1 border-b border-adm-line-div">
        {[{ id: 'general', name: 'Datos generales' }, ...professionalBranches].map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            onClick={() => changeTab(item.id)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
              tab === item.id ? 'border-brand-600 text-adm-accent-deep' : 'border-transparent text-adm-ink-400 hover:text-adm-ink-700'
            }`}
          >
            {item.name}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-4 py-3">
        <FormError message={error} />
        {notice && (
          <p className="rounded-[10px] border border-adm-status-confirmed-border bg-adm-status-confirmed-bg px-3.5 py-2.5 text-sm font-medium text-adm-status-confirmed-text">
            {notice}
          </p>
        )}

        {tab === 'general' && (
          <>
            <p className="text-sm text-adm-ink-700">
              <span className="font-semibold">{professional.fullName}</span>
              {professional.role && <span className="text-adm-ink-400"> · {roleLabels[professional.role] ?? professional.role}</span>}
            </p>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-adm-ink-700" htmlFor="ficha-bio">
                Bio (opcional)
              </label>
              <textarea
                id="ficha-bio"
                readOnly={!canEditBio}
                className="min-h-[70px] rounded-[10px] border border-adm-line-field bg-adm-surface-input px-3.5 py-2.5 text-sm text-adm-ink-700 outline-none transition-colors read-only:cursor-not-allowed read-only:border-dashed focus:border-brand-600 focus:bg-white focus:ring-2 focus:ring-adm-accent-ring"
                value={bio}
                onChange={(event) => setBio(event.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-adm-ink-700">{isSpecialist ? 'Especialidad' : 'Especialidades'}</span>
              {canEditSpecialties ? (
                <div className="flex max-h-[200px] flex-col gap-1.5 overflow-y-auto rounded-[10px] border border-adm-line-field p-3">
                  {activeSpecialties.map((specialty) => (
                    <label key={specialty.id} className="flex items-center gap-2 text-sm text-adm-ink-700">
                      <input
                        type={isSpecialist ? 'radio' : 'checkbox'}
                        name="ficha-especialidad"
                        className="h-[15px] w-[15px] accent-brand-600"
                        checked={specialtyIds.includes(specialty.id)}
                        onChange={() =>
                          setSpecialtyIds((current) => (isSpecialist ? [specialty.id] : toggle(current, specialty.id)))
                        }
                      />
                      {specialty.name}
                    </label>
                  ))}
                </div>
              ) : (
                <>
                  <p className="text-sm text-adm-ink-700">
                    {professional.specialtyIds.length > 0 ? professional.specialtyIds.map(specialtyName).join(', ') : '—'}
                  </p>
                  <p className="text-[12.5px] text-adm-ink-400">
                    {isSpecialist
                      ? 'Solo la administración general cambia la especialidad de una especialista: afecta a todas sus sedes.'
                      : 'No administras ninguna sede de esta profesional.'}
                  </p>
                </>
              )}
              <p className="text-[12.5px] text-adm-ink-400">
                Las especialidades valen para todas sus sedes. Para quitar una, primero quita sus servicios de esa
                especialidad en cada sede.
              </p>
            </div>

            {(canEditBio || canEditSpecialties) && (
              <div>
                <Button type="button" variant="admin-solid" size="sm" disabled={isSaving} onClick={saveGeneral}>
                  {isSaving ? 'Guardando…' : 'Guardar datos generales'}
                </Button>
              </div>
            )}
          </>
        )}

        {currentBranch &&
          (() => {
            const readOnly = !canManageBranch(currentBranch.id);
            const { current, options, selected } = branchServices(currentBranch.id);
            const hasSchedule = professional.scheduleBranchIds.includes(currentBranch.id);
            return (
              <>
                {readOnly && (
                  <p className="rounded-[10px] border border-adm-line-field bg-adm-surface-input px-3.5 py-2.5 text-sm text-adm-ink-400">
                    No administras esta sede: puedes ver lo que atiende aquí, pero solo lo cambia su administradora o la
                    administración general.
                  </p>
                )}
                {!currentBranch.active && <p className="text-[13px] text-adm-ink-400">Esta sede está inactiva.</p>}

                <div className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-adm-ink-700">Servicios que atiende en {currentBranch.name}</span>
                  {options.length === 0 ? (
                    <p className="text-sm text-adm-ink-400">
                      Esta sede no tiene servicios activos de sus especialidades. Créalos en "Servicios de la sede".
                    </p>
                  ) : (
                    <div className="flex flex-col gap-1.5 rounded-[10px] border border-adm-line-field p-3">
                      {options.map((service) => (
                        <label key={service.id} className="flex items-center gap-2 text-sm text-adm-ink-700">
                          <input
                            type="checkbox"
                            className="h-[15px] w-[15px] accent-brand-600"
                            disabled={readOnly}
                            checked={selected.includes(service.id)}
                            onChange={() =>
                              setSelectedByBranch((all) => ({ ...all, [currentBranch.id]: toggle(selected, service.id) }))
                            }
                          />
                          <span className="flex-1">{service.name}</span>
                          <span className="text-[12.5px] text-adm-ink-400">
                            {formatCurrency(service.price)} · {service.duration} min
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {!hasSchedule && (
                  <p className="text-[13px] font-medium text-adm-danger-text">
                    Sin horario en esta sede: no aparece en la reserva hasta que tenga uno.
                  </p>
                )}

                <div className="flex flex-wrap gap-2">
                  {!readOnly && options.length > 0 && (
                    <Button
                      type="button"
                      variant="admin-solid"
                      size="sm"
                      disabled={isSaving}
                      onClick={() =>
                        run(
                          () => setProfessionalBranchServices(professional.id, selected, current),
                          'Servicios guardados.',
                        )
                      }
                    >
                      {isSaving ? 'Guardando…' : 'Guardar servicios'}
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="admin-outline"
                    size="sm"
                    icon={<Clock size={14} />}
                    onClick={() => onOpenSchedule(currentBranch.id)}
                  >
                    Horario
                  </Button>
                  {!readOnly &&
                    (confirmRemove ? (
                      <div className="flex flex-wrap items-center gap-2 rounded-[10px] border border-adm-status-cancelled-border bg-adm-status-cancelled-bg px-3 py-2">
                        <span className="text-[13px] text-adm-danger-text">
                          Se quitan también su horario y sus servicios en {currentBranch.name}. ¿Seguro?
                        </span>
                        <Button
                          type="button"
                          variant="admin-danger"
                          size="xs"
                          disabled={isSaving}
                          onClick={() =>
                            run(async () => {
                              await removeProfessionalFromBranch(professional.id, currentBranch.id);
                              setTab('general');
                            }, `Ya no atiende en ${currentBranch.name}.`).then(() => setConfirmRemove(false))
                          }
                        >
                          Sí, quitar
                        </Button>
                        <Button type="button" variant="admin-outline" size="xs" onClick={() => setConfirmRemove(false)}>
                          No
                        </Button>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        variant="admin-danger"
                        size="sm"
                        icon={<MapPinOff size={14} />}
                        onClick={() => setConfirmRemove(true)}
                      >
                        Quitar de esta sede
                      </Button>
                    ))}
                </div>
              </>
            );
          })()}
      </div>
    </Modal>
  );
}

export default ProfessionalProfileModal;
