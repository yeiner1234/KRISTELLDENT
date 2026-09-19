import { useMemo, useState, type FormEvent } from 'react';
import { Pencil, Plus, Stethoscope } from 'lucide-react';
import SectionTitle from '../../components/common/SectionTitle';
import DataTable, { type DataTableColumn } from '../../components/common/DataTable';
import EmptyState from '../../components/common/EmptyState';
import Spinner from '../../components/common/Spinner';
import SearchInput from '../../components/common/SearchInput';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';
import StatusBadge from '../../components/common/StatusBadge';
import { useProfessionals } from '../../hooks/useProfessionals';
import { useAdminSpecialties } from '../../hooks/useAdminSpecialties';
import {
  createSpecialty,
  setSpecialtyActive,
  updateSpecialty,
  type SpecialtyInput,
} from '../../services/specialtyService';
import type { Specialty } from '../../types/Specialty';

const emptyForm: SpecialtyInput = { name: '', description: '' };

function SpecialtiesPage() {
  const { professionals, isLoading: isLoadingProfessionals } = useProfessionals();
  const { specialties, isLoading: isLoadingSpecialties, error, refetch } = useAdminSpecialties();
  const [query, setQuery] = useState('');
  const isLoading = isLoadingProfessionals || isLoadingSpecialties;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Specialty | null>(null);
  const [form, setForm] = useState<SpecialtyInput>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const openCreateModal = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (specialty: Specialty) => {
    setEditing(specialty);
    setForm({ name: specialty.name, description: specialty.description ?? '' });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    const input: SpecialtyInput = {
      name: form.name.trim(),
      description: form.description?.trim() ? form.description.trim() : null,
    };

    try {
      if (editing) {
        await updateSpecialty(editing.id, input);
      } else {
        await createSpecialty(input);
      }
      setIsModalOpen(false);
      refetch();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'No se pudo guardar la especialidad.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (specialty: Specialty) => {
    setTogglingId(specialty.id);
    try {
      await setSpecialtyActive(specialty.id, !specialty.active);
      refetch();
    } finally {
      setTogglingId(null);
    }
  };

  const columns: DataTableColumn<Specialty>[] = [
    { key: 'name', header: 'Especialidad', render: (row) => row.name },
    { key: 'description', header: 'Descripción', render: (row) => row.description ?? '—' },
    {
      key: 'professionals',
      header: 'Profesionales',
      render: (row) => professionals.filter((professional) => professional.specialtyIds.includes(row.id)).length,
    },
    {
      key: 'status',
      header: 'Estado',
      render: (row) => <StatusBadge label={row.active ? 'Activa' : 'Inactiva'} tone={row.active ? 'adm-active' : 'adm-inactive'} />,
    },
    {
      key: 'actions',
      header: '',
      render: (row) => (
        <div className="flex gap-1.5">
          <Button type="button" variant="admin-outline" size="xs" icon={<Pencil size={13} />} onClick={() => openEditModal(row)}>
            Editar
          </Button>
          <Button
            type="button"
            variant={row.active ? 'admin-danger' : 'admin-outline'}
            size="xs"
            disabled={togglingId === row.id}
            onClick={() => handleToggleActive(row)}
          >
            {togglingId === row.id ? 'Guardando…' : row.active ? 'Desactivar' : 'Activar'}
          </Button>
        </div>
      ),
    },
  ];

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return specialties;
    return specialties.filter((specialty) => specialty.name.toLowerCase().includes(term));
  }, [query, specialties]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionTitle title="Especialidades" align="left" />
        <Button type="button" variant="admin-solid" size="sm" icon={<Plus size={16} />} onClick={openCreateModal}>
          Nueva especialidad
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2.5 rounded-[14px] border border-adm-line-card bg-white p-4">
        <SearchInput
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar especialidad..."
          wrapperClassName="min-w-[180px] flex-1"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Spinner size={28} />
        </div>
      ) : error ? (
        <EmptyState icon={Stethoscope} title="No se pudieron cargar las especialidades" description={error} />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Stethoscope} title="No hay especialidades registradas" description="Aún no se han creado especialidades." />
      ) : (
        <DataTable columns={columns} rows={filtered} getRowId={(row) => row.id} />
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editing ? 'Editar especialidad' : 'Nueva especialidad'}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 py-2">
          {formError && (
            <p className="rounded-[10px] border border-adm-status-cancelled-border bg-adm-status-cancelled-bg px-3.5 py-2.5 text-sm font-medium text-adm-danger-text">
              {formError}
            </p>
          )}

          <Input
            label="Nombre"
            name="name"
            variant="admin"
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            required
          />
          <Input
            label="Descripción (opcional)"
            name="description"
            variant="admin"
            value={form.description ?? ''}
            onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
          />

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

export default SpecialtiesPage;
