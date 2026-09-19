import { useMemo, useState, type FormEvent } from 'react';
import { Plus, UserRound } from 'lucide-react';
import SectionTitle from '../../components/common/SectionTitle';
import SearchInput from '../../components/common/SearchInput';
import Select from '../../components/common/Select';
import Button from '../../components/common/Button';
import EmptyState from '../../components/common/EmptyState';
import Spinner from '../../components/common/Spinner';
import Modal from '../../components/common/Modal';
import ProfessionalCard from '../../components/professionals/ProfessionalCard';
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
import type { Professional } from '../../types/Professional';

interface FormState {
  profileId: string;
  bio: string;
  specialtyIds: string[];
  branchIds: string[];
  serviceIds: string[];
}

const emptyForm: FormState = { profileId: '', bio: '', specialtyIds: [], branchIds: [], serviceIds: [] };

function toggleInList(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter((item) => item !== id) : [...list, id];
}

function ProfessionalsPage() {
  const { professionals, isLoading: isLoadingProfessionals, error, refetch } = useAdminProfessionals();
  const { specialties, isLoading: isLoadingSpecialties } = useAdminSpecialties();
  const { branches, isLoading: isLoadingBranches } = useAdminBranches();
  const { services, isLoading: isLoadingServices } = useAdminServices();
  const [query, setQuery] = useState('');
  const [specialtyFilter, setSpecialtyFilter] = useState('');
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

  const openCreateModal = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormError(null);
    setIsModalOpen(true);
    setIsLoadingEligible(true);
    getEligibleProfilesForProfessional()
      .then(setEligibleProfiles)
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

  const toggleSpecialty = (specialtyId: string) => {
    setForm((current) => {
      const nextSpecialtyIds = toggleInList(current.specialtyIds, specialtyId);
      // Al desmarcar una especialidad, se sueltan los servicios que ya no aplican.
      const nextServiceIds = current.serviceIds.filter((serviceId) => {
        const service = services.find((item) => item.id === serviceId);
        return service ? nextSpecialtyIds.includes(service.specialtyId) : false;
      });
      return { ...current, specialtyIds: nextSpecialtyIds, serviceIds: nextServiceIds };
    });
  };

  const availableServicesForForm = useMemo(
    () => activeServices.filter((service) => form.specialtyIds.includes(service.specialtyId)),
    [activeServices, form.specialtyIds],
  );

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);

    if (!editing && !form.profileId) {
      setFormError('Selecciona la cuenta de especialista.');
      return;
    }

    setIsSubmitting(true);

    const relations = { specialtyIds: form.specialtyIds, branchIds: form.branchIds, serviceIds: form.serviceIds };
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
    try {
      await setProfessionalActive(professional.id, !professional.active);
      refetch();
    } finally {
      setTogglingId(null);
    }
  };

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return professionals
      .filter((professional) => (specialtyFilter ? professional.specialtyIds.includes(specialtyFilter) : true))
      .filter((professional) => (term ? professional.fullName.toLowerCase().includes(term) : true));
  }, [query, specialtyFilter, professionals]);

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
      </div>

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
            const specialtyName = specialties
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
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 py-2">
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
              No hay cuentas de especialista disponibles. Invita una desde "Equipo" primero.
            </p>
          ) : (
            <Select
              label="Cuenta de especialista"
              value={form.profileId}
              onChange={(event) => setForm((current) => ({ ...current, profileId: event.target.value }))}
              options={[
                { value: '', label: 'Selecciona una cuenta' },
                ...eligibleProfiles.map((profile) => ({ value: profile.id, label: `${profile.fullName} (${profile.email})` })),
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

          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-adm-ink-700">Especialidades</span>
            {activeSpecialties.length === 0 ? (
              <p className="text-sm text-adm-ink-400">No hay especialidades activas.</p>
            ) : (
              <div className="flex flex-col gap-1.5 rounded-[10px] border border-adm-line-field p-3">
                {activeSpecialties.map((specialty) => (
                  <label key={specialty.id} className="flex items-center gap-2 text-sm text-adm-ink-700">
                    <input
                      type="checkbox"
                      className="h-[15px] w-[15px] accent-brand-600"
                      checked={form.specialtyIds.includes(specialty.id)}
                      onChange={() => toggleSpecialty(specialty.id)}
                    />
                    {specialty.name}
                  </label>
                ))}
              </div>
            )}
          </div>

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
            {form.specialtyIds.length === 0 ? (
              <p className="text-sm text-adm-ink-400">Elige al menos una especialidad para ver sus servicios.</p>
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

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="admin-outline" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="admin-solid" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando…' : 'Guardar'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default ProfessionalsPage;
