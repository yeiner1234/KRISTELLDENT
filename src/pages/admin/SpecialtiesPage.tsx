import { useMemo, useState, type FormEvent } from 'react';
import { CircleCheck, CircleOff, Layers, Plus, Stethoscope, Tags } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import { useAuth } from '../../hooks/useAuth';
import EmptyState from '../../components/common/EmptyState';
import Spinner from '../../components/common/Spinner';
import SearchInput from '../../components/common/SearchInput';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import FormError from '../../components/common/FormError';
import Input from '../../components/common/Input';
import FilterTabs from '../../components/common/FilterTabs';
import SpecialtyCard from '../../components/specialties/SpecialtyCard';
import { useSpecialtiesAdmin } from '../../hooks/useOffer';
import {
  createSpecialty,
  deleteSpecialty,
  setSpecialtyActive,
  updateSpecialty,
  type SpecialtyInput,
} from '../../services/specialtyService';
import { isSameSpecialtyName, similarSpecialties } from '../../utils/specialtyMatch';
import type { AdminSpecialty } from '../../types/Offer';

const emptyForm: SpecialtyInput = { name: '', description: '' };

type StatusFilter = 'all' | 'active' | 'inactive';

// Lista compartida de especialidades (spec 10.3). Las dos administradoras
// agregan; solo admin_global renombra, desactiva y borra, porque afecta a
// todas las sedes.
function SpecialtiesPage() {
  const { user } = useAuth();
  const isAdminGlobal = user?.role === 'admin_global';
  const { data: specialties, isLoading, error, refetch } = useSpecialtiesAdmin();
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminSpecialty | null>(null);
  const [form, setForm] = useState<SpecialtyInput>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const otherSpecialties = specialties.filter((specialty) => specialty.id !== editing?.id);
  const exactDuplicate = otherSpecialties.find((specialty) => isSameSpecialtyName(specialty.name, form.name));
  const similar = exactDuplicate ? [] : similarSpecialties(form.name, otherSpecialties);

  const openCreateModal = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (specialty: AdminSpecialty) => {
    setEditing(specialty);
    setForm({ name: specialty.name, description: specialty.description ?? '' });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (exactDuplicate) {
      setFormError('Ya existe esa especialidad: elígela de la lista.');
      return;
    }
    setFormError(null);
    setIsSubmitting(true);
    try {
      if (editing) {
        await updateSpecialty(editing.id, form);
      } else {
        await createSpecialty(form);
      }
      setIsModalOpen(false);
      refetch();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'No se pudo guardar la especialidad.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const runAction = async (id: string, action: () => Promise<unknown>) => {
    setBusyId(id);
    setActionError(null);
    try {
      await action();
      setConfirmDeleteId(null);
      refetch();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'No se pudo actualizar la especialidad.');
    } finally {
      setBusyId(null);
    }
  };

  const activeCount = specialties.filter((specialty) => specialty.active).length;

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return specialties
      .filter((specialty) => statusFilter === 'all' || specialty.active === (statusFilter === 'active'))
      .filter((specialty) => !term || specialty.name.toLowerCase().includes(term));
  }, [query, specialties, statusFilter]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Especialidades"
        icon={Tags}
        subtitle={`Lista compartida por todas las sedes.${
          isAdminGlobal ? '' : ' Para renombrar o desactivar una especialidad, pídelo a la administración general.'
        }`}
        action={
          <Button type="button" variant="admin-solid" size="sm" icon={<Plus size={16} />} onClick={openCreateModal}>
            Agregar especialidad
          </Button>
        }
      />

      <div className="flex flex-col gap-3 rounded-[14px] border border-adm-line-card bg-white p-4 lg:flex-row lg:items-center">
        <FilterTabs
          ariaLabel="Filtrar especialidades"
          value={statusFilter}
          onChange={setStatusFilter}
          tabs={[
            { value: 'all', label: 'Todas', icon: Layers, count: specialties.length },
            {
              value: 'active',
              label: 'Activas',
              icon: CircleCheck,
              count: activeCount,
              activeClassName: 'border-adm-status-confirmed-solid bg-adm-status-confirmed-solid text-white',
            },
            {
              value: 'inactive',
              label: 'Inactivas',
              icon: CircleOff,
              count: specialties.length - activeCount,
              activeClassName: 'border-adm-status-completed-solid bg-adm-status-completed-solid text-white',
            },
          ]}
        />
        <SearchInput
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar especialidad..."
          aria-label="Buscar especialidad"
          wrapperClassName="min-w-[180px] flex-1"
        />
      </div>

      <FormError message={actionError} />

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Spinner size={28} />
        </div>
      ) : error ? (
        <EmptyState icon={Stethoscope} title="No se pudieron cargar las especialidades" description={error} />
      ) : specialties.length === 0 ? (
        <EmptyState icon={Stethoscope} title="No hay especialidades registradas" description="Aún no se han agregado especialidades." />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Stethoscope} title="Sin especialidades para mostrar" description="Ninguna especialidad coincide con la búsqueda o el filtro." />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3" aria-label="Lista de especialidades">
          {filtered.map((specialty) => (
            <li key={specialty.id} className="flex">
              <SpecialtyCard
                specialty={specialty}
                canManage={isAdminGlobal}
                busy={busyId === specialty.id}
                confirmingDelete={confirmDeleteId === specialty.id}
                onEdit={() => openEditModal(specialty)}
                onToggleActive={() => runAction(specialty.id, () => setSpecialtyActive(specialty.id, !specialty.active))}
                onAskDelete={() => setConfirmDeleteId(specialty.id)}
                onCancelDelete={() => setConfirmDeleteId(null)}
                onConfirmDelete={() => runAction(specialty.id, () => deleteSpecialty(specialty.id))}
              />
            </li>
          ))}
        </ul>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editing ? 'Editar especialidad' : 'Agregar especialidad'}
        footer={
          <>
            <Button type="button" variant="admin-outline" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="especialidad-form" variant="admin-solid" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando…' : 'Guardar'}
            </Button>
          </>
        }
      >
        <form id="especialidad-form" onSubmit={handleSubmit} className="flex flex-col gap-4 py-2">
          <FormError message={formError} />

          <Input
            label="Nombre"
            name="name"
            variant="admin"
            value={form.name}
            onChange={(event) => {
              setForm((current) => ({ ...current, name: event.target.value }));
              setFormError(null);
            }}
            required
          />
          {exactDuplicate && (
            <p className="text-[13px] font-medium text-adm-danger-text">
              Ya existe "{exactDuplicate.name}": elígela de la lista en lugar de crearla.
            </p>
          )}
          {similar.length > 0 && (
            <p className="text-[13px] text-adm-ink-700">
              ¿Quisiste decir {similar.map((specialty) => `"${specialty.name}"`).join(' o ')}? Si es la misma, no la
              agregues: ya está en la lista.
            </p>
          )}
          <Input
            label="Descripción (opcional)"
            name="description"
            variant="admin"
            value={form.description ?? ''}
            onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
          />
        </form>
      </Modal>
    </div>
  );
}

export default SpecialtiesPage;
