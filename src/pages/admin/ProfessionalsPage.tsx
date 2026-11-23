import { useMemo, useState, type FormEvent } from 'react';
import { Plus, Trash2, UserRound } from 'lucide-react';
import SectionTitle from '../../components/common/SectionTitle';
import SearchInput from '../../components/common/SearchInput';
import Select from '../../components/common/Select';
import Button from '../../components/common/Button';
import EmptyState from '../../components/common/EmptyState';
import Spinner from '../../components/common/Spinner';
import Modal from '../../components/common/Modal';
import FormError from '../../components/common/FormError';
import ProfessionalCard from '../../components/professionals/ProfessionalCard';
import ScheduleExceptionsPanel from '../../components/schedule/ScheduleExceptionsPanel';
import { useAdminProfessionals } from '../../hooks/useAdminProfessionals';
import { useAdminSpecialties } from '../../hooks/useAdminSpecialties';
import { useAdminBranches } from '../../hooks/useAdminBranches';
import { useAdminServices } from '../../hooks/useAdminServices';
import {
  createProfessional,
  getEligibleProfilesForProfessional,
  setProfessionalActive,
  updateProfessional,
  type EligibleProfile,
} from '../../services/professionalService';
import {
  getProfessionalScheduleForAdmin,
  setProfessionalSchedule,
  type ProfessionalScheduleEntry,
} from '../../services/professionalScheduleService';
import { getBranchScheduleForAdmin, type BranchScheduleEntry } from '../../services/branchScheduleService';
import { DAY_LABELS, rangesOutsideBranchHours, validateWeeklySchedule } from '../../utils/scheduleValidation';
import { activeBranchesOf } from '../../utils/professionalBranches';
import type { Professional } from '../../types/Professional';

interface FormState {
  profileId: string;
  bio: string;
  specialtyIds: string[];
  branchIds: string[];
  serviceIds: string[];
}

const emptyForm: FormState = { profileId: '', bio: '', specialtyIds: [], branchIds: [], serviceIds: [] };

// Lunes primero en pantalla; day_of_week sigue siendo 0 = domingo.
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

interface TimeBlock {
  start: string;
  end: string;
}

interface DayBlocksState {
  open: boolean;
  blocks: TimeBlock[];
}

function emptyScheduleForm(): DayBlocksState[] {
  return DAY_LABELS.map(() => ({ open: false, blocks: [] }));
}

function toggleInList(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter((item) => item !== id) : [...list, id];
}

function ProfessionalsPage() {
  const { professionals, isLoading: isLoadingProfessionals, error: professionalsError, refetch } = useAdminProfessionals();
  const { specialties, isLoading: isLoadingSpecialties, error: specialtiesError } = useAdminSpecialties();
  const { branches, isLoading: isLoadingBranches, error: branchesError } = useAdminBranches();
  const { services, isLoading: isLoadingServices, error: servicesError } = useAdminServices();
  const error = professionalsError ?? specialtiesError ?? branchesError ?? servicesError;
  const [query, setQuery] = useState('');
  const [specialtyFilter, setSpecialtyFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const isLoading = isLoadingProfessionals || isLoadingSpecialties || isLoadingBranches || isLoadingServices;

  const activeSpecialties = useMemo(() => specialties.filter((specialty) => specialty.active), [specialties]);
  const activeBranches = useMemo(() => branches.filter((branch) => branch.active), [branches]);
  const activeServices = useMemo(() => services.filter((service) => service.active), [services]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Professional | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [eligibleProfiles, setEligibleProfiles] = useState<EligibleProfile[]>([]);
  const [isLoadingEligible, setIsLoadingEligible] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [toggleError, setToggleError] = useState<string | null>(null);

  const [scheduleProfessional, setScheduleProfessional] = useState<Professional | null>(null);
  const [scheduleBranchId, setScheduleBranchId] = useState('');
  const [scheduleForm, setScheduleForm] = useState<DayBlocksState[]>(emptyScheduleForm());
  const [isLoadingSchedule, setIsLoadingSchedule] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);
  const [branchHours, setBranchHours] = useState<BranchScheduleEntry[]>([]);
  const [scheduleTab, setScheduleTab] = useState<'weekly' | 'exceptions'>('weekly');

  const openCreateModal = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormError(null);
    setIsModalOpen(true);
    setIsLoadingEligible(true);
    getEligibleProfilesForProfessional()
      .then(setEligibleProfiles)
      .catch((err) => setFormError(err instanceof Error ? err.message : 'No se pudieron cargar las cuentas disponibles.'))
      .finally(() => setIsLoadingEligible(false));
  };

  const openEditModal = (professional: Professional) => {
    setEditing(professional);
    setForm({
      profileId: professional.id,
      bio: professional.bio ?? '',
      specialtyIds: professional.specialtyIds,
      branchIds: professional.branchIds,
      serviceIds: professional.serviceIds,
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  // El rol decide cómo se arman especialidades y servicios: el especialista
  // elige una sola especialidad y servicios de ella; la odontóloga general
  // elige servicios de cualquier especialidad y sus especialidades se derivan
  // de esos servicios al guardar.
  const selectedRole = editing
    ? editing.role
    : (eligibleProfiles.find((profile) => profile.id === form.profileId)?.role ?? null);
  const isGeneralDentist = selectedRole === 'odontologa_general';

  const selectSpecialty = (specialtyId: string) => {
    setForm((current) => ({
      ...current,
      specialtyIds: [specialtyId],
      // Al cambiar de especialidad, se sueltan los servicios que ya no aplican.
      serviceIds: current.serviceIds.filter(
        (serviceId) => services.find((item) => item.id === serviceId)?.specialtyId === specialtyId,
      ),
    }));
  };

  const availableServicesForForm = useMemo(
    () => activeServices.filter((service) => form.specialtyIds.includes(service.specialtyId)),
    [activeServices, form.specialtyIds],
  );

  const servicesBySpecialty = useMemo(
    () =>
      activeSpecialties
        .map((specialty) => ({
          specialty,
          services: activeServices.filter((service) => service.specialtyId === specialty.id),
        }))
        .filter((group) => group.services.length > 0),
    [activeSpecialties, activeServices],
  );

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);

    if (!editing && !form.profileId) {
      setFormError('Selecciona la cuenta del profesional.');
      return;
    }
    if (!form.branchIds.some((branchId) => activeBranches.some((branch) => branch.id === branchId))) {
      setFormError('Elige al menos una sede activa.');
      return;
    }
    if (!isGeneralDentist && form.specialtyIds.length === 0) {
      setFormError('Elige una especialidad.');
      return;
    }
    if (!isGeneralDentist && form.specialtyIds.length > 1) {
      setFormError('Un especialista solo puede tener una especialidad. Elige una.');
      return;
    }
    if (isGeneralDentist && form.serviceIds.length === 0) {
      setFormError('Elige al menos un servicio.');
      return;
    }

    setIsSubmitting(true);

    const specialtyIds = isGeneralDentist
      ? [
          ...new Set(
            form.serviceIds
              .map((serviceId) => services.find((service) => service.id === serviceId)?.specialtyId)
              .filter((specialtyId): specialtyId is string => Boolean(specialtyId)),
          ),
        ]
      : form.specialtyIds;
    const relations = { specialtyIds, branchIds: form.branchIds, serviceIds: form.serviceIds };
    const bio = form.bio.trim() ? form.bio.trim() : null;

    try {
      if (editing) {
        await updateProfessional(editing.id, { bio, ...relations });
      } else {
        await createProfessional({ profileId: form.profileId, bio, ...relations });
      }
      setIsModalOpen(false);
      refetch();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'No se pudo guardar el profesional.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (professional: Professional) => {
    setTogglingId(professional.id);
    setToggleError(null);
    try {
      await setProfessionalActive(professional.id, !professional.active);
      refetch();
    } catch (err) {
      setToggleError(err instanceof Error ? err.message : 'No se pudo actualizar el profesional.');
    } finally {
      setTogglingId(null);
    }
  };

  const loadSchedule = (professionalId: string, branchId: string) => {
    if (!branchId) {
      setScheduleForm(emptyScheduleForm());
      return;
    }
    setIsLoadingSchedule(true);
    setScheduleError(null);
    setBranchHours([]);
    // El horario de la sede solo alimenta el aviso: si falla, no bloquea.
    getBranchScheduleForAdmin(branchId)
      .then(setBranchHours)
      .catch(() => setBranchHours([]));
    getProfessionalScheduleForAdmin(professionalId, branchId)
      .then((entries) => {
        const next = emptyScheduleForm();
        for (const entry of entries) {
          next[entry.dayOfWeek] = {
            open: true,
            blocks: [...next[entry.dayOfWeek].blocks, { start: entry.startTime, end: entry.endTime }],
          };
        }
        setScheduleForm(next);
      })
      .catch((err) => setScheduleError(err instanceof Error ? err.message : 'No se pudo cargar el horario.'))
      .finally(() => setIsLoadingSchedule(false));
  };

  const openScheduleModal = (professional: Professional) => {
    // Abre en la primera sede activa: una inactiva no ofrece horarios.
    const firstBranch = activeBranchesOf(professional.branchIds, branches)[0]?.id ?? '';
    setScheduleProfessional(professional);
    setScheduleTab('weekly');
    setScheduleError(null);
    setScheduleBranchId(firstBranch);
    setScheduleForm(emptyScheduleForm());
    if (firstBranch) {
      loadSchedule(professional.id, firstBranch);
    }
  };

  const handleScheduleBranchChange = (branchId: string) => {
    setScheduleBranchId(branchId);
    if (scheduleProfessional) {
      loadSchedule(scheduleProfessional.id, branchId);
    }
  };

  // Cualquier cambio en el horario deja atrás el error del intento anterior.
  const toggleScheduleDay = (dayIndex: number) => {
    setScheduleError(null);
    setScheduleForm((current) =>
      current.map((day, index) =>
        index === dayIndex
          ? { open: !day.open, blocks: day.blocks.length > 0 ? day.blocks : [{ start: '09:00', end: '13:00' }] }
          : day,
      ),
    );
  };

  const addScheduleBlock = (dayIndex: number) => {
    setScheduleError(null);
    setScheduleForm((current) =>
      current.map((day, index) =>
        index === dayIndex ? { ...day, blocks: [...day.blocks, { start: '14:00', end: '17:00' }] } : day,
      ),
    );
  };

  const removeScheduleBlock = (dayIndex: number, blockIndex: number) => {
    setScheduleError(null);
    setScheduleForm((current) =>
      current.map((day, index) =>
        index === dayIndex ? { ...day, blocks: day.blocks.filter((_, i) => i !== blockIndex) } : day,
      ),
    );
  };

  const updateScheduleBlock = (dayIndex: number, blockIndex: number, field: 'start' | 'end', value: string) => {
    setScheduleError(null);
    setScheduleForm((current) =>
      current.map((day, index) =>
        index === dayIndex
          ? { ...day, blocks: day.blocks.map((block, i) => (i === blockIndex ? { ...block, [field]: value } : block)) }
          : day,
      ),
    );
  };

  const scheduleEntries: ProfessionalScheduleEntry[] = useMemo(
    () =>
      scheduleForm.flatMap((day, dayOfWeek) =>
        day.open ? day.blocks.map((block) => ({ dayOfWeek, startTime: block.start, endTime: block.end })) : [],
      ),
    [scheduleForm],
  );
  const daysOutsideBranchHours = useMemo(
    () => rangesOutsideBranchHours(scheduleEntries, branchHours),
    [scheduleEntries, branchHours],
  );

  const handleSaveSchedule = async (event: FormEvent) => {
    event.preventDefault();
    if (!scheduleProfessional || !scheduleBranchId) return;

    const validationError = validateWeeklySchedule(scheduleEntries);
    if (validationError) {
      setScheduleError(validationError);
      return;
    }

    setScheduleError(null);
    setIsSavingSchedule(true);
    const entries = scheduleEntries;

    try {
      await setProfessionalSchedule(scheduleProfessional.id, scheduleBranchId, entries);
      setScheduleProfessional(null);
    } catch (err) {
      setScheduleError(err instanceof Error ? err.message : 'No se pudo guardar el horario.');
    } finally {
      setIsSavingSchedule(false);
    }
  };

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return professionals
      .filter((professional) => (specialtyFilter ? professional.specialtyIds.includes(specialtyFilter) : true))
      .filter((professional) => (branchFilter ? professional.branchIds.includes(branchFilter) : true))
      .filter((professional) => (term ? professional.fullName.toLowerCase().includes(term) : true));
  }, [query, specialtyFilter, branchFilter, professionals]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionTitle title="Profesionales" align="left" />
        <Button type="button" variant="admin-solid" size="sm" icon={<Plus size={16} />} onClick={openCreateModal}>
          Nuevo profesional
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2.5 rounded-[14px] border border-adm-line-card bg-white p-4">
        <SearchInput
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar por nombre..."
          wrapperClassName="min-w-[180px] flex-1"
        />
        <div className="w-full max-w-[220px]">
          <Select
            label="Especialidad"
            hideLabel
            value={specialtyFilter}
            onChange={(event) => setSpecialtyFilter(event.target.value)}
            options={[{ value: '', label: 'Todas las especialidades' }, ...specialties.map((s) => ({ value: s.id, label: s.name }))]}
          />
        </div>
        <div className="w-full max-w-[220px]">
          <Select
            label="Sede"
            hideLabel
            value={branchFilter}
            onChange={(event) => setBranchFilter(event.target.value)}
            options={[{ value: '', label: 'Todas las sedes' }, ...branches.map((b) => ({ value: b.id, label: b.name }))]}
          />
        </div>
      </div>

      <FormError message={toggleError} />

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Spinner size={28} />
        </div>
      ) : error ? (
        <EmptyState icon={UserRound} title="No se pudieron cargar los profesionales" description={error} />
      ) : filtered.length === 0 ? (
        <EmptyState icon={UserRound} title="No hay profesionales registrados" description="No se encontraron profesionales con ese filtro." />
      ) : (
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
          {filtered.map((professional) => {
            const specialtyName =
              professional.role === 'odontologa_general'
                ? 'Odontóloga general'
                : specialties
                    .filter((specialty) => professional.specialtyIds.includes(specialty.id))
                    .map((specialty) => specialty.name)
                    .join(', ');

            return (
              <div key={professional.id} className="flex flex-col gap-2">
                <ProfessionalCard
                  professional={professional}
                  specialtyName={specialtyName || undefined}
                  variant="admin"
                  agendaHref="/admin/agenda"
                  onEdit={() => openEditModal(professional)}
                  onSchedule={
                    activeBranchesOf(professional.branchIds, branches).length > 0
                      ? () => openScheduleModal(professional)
                      : undefined
                  }
                />
                <Button
                  type="button"
                  variant={professional.active ? 'admin-danger' : 'admin-outline'}
                  size="xs"
                  disabled={togglingId === professional.id}
                  onClick={() => handleToggleActive(professional)}
                >
                  {togglingId === professional.id ? 'Guardando…' : professional.active ? 'Desactivar' : 'Activar'}
                </Button>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editing ? 'Editar profesional' : 'Nuevo profesional'}
        maxWidth="max-w-[520px]"
        footer={
          <>
            <Button type="button" variant="admin-outline" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="profesional-form" variant="admin-solid" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando…' : 'Guardar'}
            </Button>
          </>
        }
      >
        <form id="profesional-form" onSubmit={handleSubmit} className="flex flex-col gap-4 py-2">
          {formError && (
            <p className="rounded-[10px] border border-adm-status-cancelled-border bg-adm-status-cancelled-bg px-3.5 py-2.5 text-sm font-medium text-adm-danger-text">
              {formError}
            </p>
          )}

          {editing ? (
            <p className="text-sm text-adm-ink-700">
              <span className="font-semibold">{editing.fullName}</span>
            </p>
          ) : isLoadingEligible ? (
            <Spinner size={20} />
          ) : eligibleProfiles.length === 0 ? (
            <p className="text-sm text-adm-ink-400">
              No hay cuentas de especialista u odontóloga general disponibles. Invita una desde "Equipo" primero.
            </p>
          ) : (
            <Select
              label="Cuenta del profesional"
              value={form.profileId}
              // Cambiar de cuenta puede cambiar el rol: se limpian especialidades y servicios.
              onChange={(event) =>
                setForm((current) => ({ ...current, profileId: event.target.value, specialtyIds: [], serviceIds: [] }))
              }
              options={[
                { value: '', label: 'Selecciona una cuenta' },
                ...eligibleProfiles.map((profile) => ({
                  value: profile.id,
                  label: `${profile.fullName} (${profile.email}) · ${
                    profile.role === 'odontologa_general' ? 'Odontóloga general' : 'Especialista'
                  }`,
                })),
              ]}
            />
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-adm-ink-700" htmlFor="bio">
              Bio (opcional)
            </label>
            <textarea
              id="bio"
              className="min-h-[70px] rounded-[10px] border border-adm-line-field bg-adm-surface-input px-3.5 py-2.5 text-sm text-adm-ink-700 outline-none transition-colors focus:border-brand-600 focus:bg-white focus:ring-2 focus:ring-adm-accent-ring"
              value={form.bio}
              onChange={(event) => setForm((current) => ({ ...current, bio: event.target.value }))}
            />
          </div>

          {!isGeneralDentist && (
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-adm-ink-700">Especialidad</span>
              {form.specialtyIds.length > 1 && (
                <p className="text-sm text-adm-danger-text">
                  Este especialista tiene varias especialidades. Elige solo una para poder guardar.
                </p>
              )}
              {activeSpecialties.length === 0 ? (
                <p className="text-sm text-adm-ink-400">No hay especialidades activas.</p>
              ) : (
                <div className="flex flex-col gap-1.5 rounded-[10px] border border-adm-line-field p-3">
                  {activeSpecialties.map((specialty) => (
                    <label key={specialty.id} className="flex items-center gap-2 text-sm text-adm-ink-700">
                      <input
                        type="radio"
                        name="specialty"
                        className="h-[15px] w-[15px] accent-brand-600"
                        checked={form.specialtyIds.length === 1 && form.specialtyIds[0] === specialty.id}
                        onChange={() => selectSpecialty(specialty.id)}
                      />
                      {specialty.name}
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-adm-ink-700">Sedes</span>
            {activeBranches.length === 0 ? (
              <p className="text-sm text-adm-ink-400">No hay sedes activas.</p>
            ) : (
              <div className="flex flex-col gap-1.5 rounded-[10px] border border-adm-line-field p-3">
                {activeBranches.map((branch) => (
                  <label key={branch.id} className="flex items-center gap-2 text-sm text-adm-ink-700">
                    <input
                      type="checkbox"
                      className="h-[15px] w-[15px] accent-brand-600"
                      checked={form.branchIds.includes(branch.id)}
                      onChange={() => setForm((current) => ({ ...current, branchIds: toggleInList(current.branchIds, branch.id) }))}
                    />
                    {branch.name}
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-adm-ink-700">Servicios</span>
            {isGeneralDentist ? (
              servicesBySpecialty.length === 0 ? (
                <p className="text-sm text-adm-ink-400">No hay servicios activos.</p>
              ) : (
                <div className="flex flex-col gap-3 rounded-[10px] border border-adm-line-field p-3">
                  {servicesBySpecialty.map(({ specialty, services: groupServices }) => (
                    <div key={specialty.id} className="flex flex-col gap-1.5">
                      <span className="text-xs font-semibold uppercase tracking-wide text-adm-ink-400">
                        {specialty.name}
                      </span>
                      {groupServices.map((service) => (
                        <label key={service.id} className="flex items-center gap-2 text-sm text-adm-ink-700">
                          <input
                            type="checkbox"
                            className="h-[15px] w-[15px] accent-brand-600"
                            checked={form.serviceIds.includes(service.id)}
                            onChange={() =>
                              setForm((current) => ({ ...current, serviceIds: toggleInList(current.serviceIds, service.id) }))
                            }
                          />
                          {service.name}
                        </label>
                      ))}
                    </div>
                  ))}
                </div>
              )
            ) : form.specialtyIds.length === 0 ? (
              <p className="text-sm text-adm-ink-400">Elige una especialidad para ver sus servicios.</p>
            ) : availableServicesForForm.length === 0 ? (
              <p className="text-sm text-adm-ink-400">No hay servicios activos para las especialidades elegidas.</p>
            ) : (
              <div className="flex flex-col gap-1.5 rounded-[10px] border border-adm-line-field p-3">
                {availableServicesForForm.map((service) => (
                  <label key={service.id} className="flex items-center gap-2 text-sm text-adm-ink-700">
                    <input
                      type="checkbox"
                      className="h-[15px] w-[15px] accent-brand-600"
                      checked={form.serviceIds.includes(service.id)}
                      onChange={() => setForm((current) => ({ ...current, serviceIds: toggleInList(current.serviceIds, service.id) }))}
                    />
                    {service.name}
                  </label>
                ))}
              </div>
            )}
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={scheduleProfessional !== null}
        onClose={() => setScheduleProfessional(null)}
        title={scheduleProfessional ? `Horario — ${scheduleProfessional.fullName}` : 'Horario'}
        maxWidth="max-w-[560px]"
        footer={
          scheduleProfessional && scheduleTab === 'weekly' ? (
            <>
              <Button type="button" variant="admin-outline" onClick={() => setScheduleProfessional(null)}>
                Cancelar
              </Button>
              <Button type="submit" form="horario-profesional-form" variant="admin-solid" disabled={isSavingSchedule || !scheduleBranchId}>
                {isSavingSchedule ? 'Guardando…' : 'Guardar horario'}
              </Button>
            </>
          ) : undefined
        }
      >
        {scheduleProfessional && (
          <div role="tablist" className="flex gap-1 border-b border-adm-line-div">
            {(
              [
                ['weekly', 'Horario semanal'],
                ['exceptions', 'Ausencias y turnos extra'],
              ] as const
            ).map(([tab, label]) => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={scheduleTab === tab}
                onClick={() => setScheduleTab(tab)}
                className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                  scheduleTab === tab
                    ? 'border-brand-600 text-adm-accent-deep'
                    : 'border-transparent text-adm-ink-400 hover:text-adm-ink-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {scheduleProfessional && scheduleTab === 'exceptions' && (
          <ScheduleExceptionsPanel
            mode="professional"
            professionalId={scheduleProfessional.id}
            branches={activeBranchesOf(scheduleProfessional.branchIds, branches)}
          />
        )}

        {scheduleProfessional && scheduleTab === 'weekly' && (
          <form id="horario-profesional-form" onSubmit={handleSaveSchedule} className="flex flex-col gap-4 py-2">
            <FormError message={scheduleError} />

            <Select
              label="Sede"
              value={scheduleBranchId}
              onChange={(event) => handleScheduleBranchChange(event.target.value)}
              options={activeBranchesOf(scheduleProfessional.branchIds, branches).map((branch) => ({
                value: branch.id,
                label: branch.name,
              }))}
            />

            {isLoadingSchedule ? (
              <div className="flex justify-center py-8">
                <Spinner size={26} />
              </div>
            ) : (
              <div className="flex flex-col divide-y divide-adm-line-div rounded-[10px] border border-adm-line-field">
                {DAY_ORDER.map((dayIndex) => {
                  const label = DAY_LABELS[dayIndex];
                  const day = scheduleForm[dayIndex];
                  const branchDay = branchHours.find((item) => item.dayOfWeek === dayIndex);
                  const timeClass =
                    'h-8 rounded-[8px] border border-adm-line-field bg-adm-surface-input px-1.5 text-sm text-adm-ink-700 outline-none focus:border-brand-600';
                  // Una fila por día: nombre, bloques y "+ Bloque"; pasa a otra
                  // línea solo si no cabe. Un día sin marcar es solo su nombre.
                  return (
                    <div
                      key={label}
                      className={`flex flex-wrap items-center gap-x-3 gap-y-1.5 px-2.5 ${day.open ? 'py-2' : 'py-1.5'}`}
                    >
                      <label className="flex w-[124px] shrink-0 items-center gap-2 text-sm font-medium text-adm-ink-700">
                        <input
                          type="checkbox"
                          className="h-[15px] w-[15px] accent-brand-600"
                          checked={day.open}
                          onChange={() => toggleScheduleDay(dayIndex)}
                        />
                        <span className="flex flex-col leading-tight">
                          {label}
                          <span className="text-[11px] font-normal text-adm-ink-400">
                            {branchDay ? `Sede ${branchDay.openTime}–${branchDay.closeTime}` : 'Sede cerrada'}
                          </span>
                        </span>
                      </label>

                      {day.open &&
                        day.blocks.map((block, blockIndex) => (
                          <div key={blockIndex} className="flex items-center gap-1">
                            <input
                              type="time"
                              aria-label={`${label}, inicio del bloque ${blockIndex + 1}`}
                              value={block.start}
                              onChange={(event) => updateScheduleBlock(dayIndex, blockIndex, 'start', event.target.value)}
                              className={timeClass}
                            />
                            <span className="text-sm text-adm-ink-400">–</span>
                            <input
                              type="time"
                              aria-label={`${label}, fin del bloque ${blockIndex + 1}`}
                              value={block.end}
                              onChange={(event) => updateScheduleBlock(dayIndex, blockIndex, 'end', event.target.value)}
                              className={timeClass}
                            />
                            <button
                              type="button"
                              aria-label="Quitar bloque"
                              onClick={() => removeScheduleBlock(dayIndex, blockIndex)}
                              className="flex h-8 w-7 items-center justify-center rounded-[8px] text-adm-ink-300 transition-colors hover:bg-adm-status-cancelled-bg hover:text-adm-danger-text"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}

                      {day.open && (
                        <button
                          type="button"
                          onClick={() => addScheduleBlock(dayIndex)}
                          className="text-[13px] font-medium text-adm-accent-deep hover:underline"
                        >
                          + Bloque
                        </button>
                      )}

                      {day.open && daysOutsideBranchHours.includes(dayIndex) && (
                        <p className="basis-full pl-[23px] text-[12.5px] text-amber-700">
                          Fuera del horario de la sede: esas horas no se ofrecerán a los pacientes.
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </form>
        )}
      </Modal>
    </div>
  );
}

export default ProfessionalsPage;
