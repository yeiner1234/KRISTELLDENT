import { useMemo, useState, type FormEvent } from 'react';
import { Pencil, Plus, Stethoscope, Trash2 } from 'lucide-react';
import SectionTitle from '../../components/common/SectionTitle';
import { useAuth } from '../../hooks/useAuth';
import DataTable, { type DataTableColumn } from '../../components/common/DataTable';
import EmptyState from '../../components/common/EmptyState';
import Spinner from '../../components/common/Spinner';
import SearchInput from '../../components/common/SearchInput';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import FormError from '../../components/common/FormError';
import Input from '../../components/common/Input';
import StatusBadge from '../../components/common/StatusBadge';
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

// Lista compartida de especialidades (spec 10.3). Las dos administradoras
// agregan; solo admin_global renombra, desactiva y borra, porque afecta a
// todas las sedes.
function SpecialtiesPage() {
  const { user } = useAuth();
  const isAdminGlobal = user?.role === 'admin_global';
  const { data: specialties, isLoading, error, refetch } = useSpecialtiesAdmin();
  const [query, setQuery] = useState('');

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

  const columns: DataTableColumn<AdminSpecialty>[] = [
    { key: 'name', header: 'Especialidad', render: (row) => <span className="font-medium">{row.name}</span> },
    {
      key: 'description',
      header: 'Descripción',
      render: (row) => <span className="block min-w-[160px] max-w-[300px] whitespace-normal">{row.description ?? '—'}</span>,
    },
    {
      key: 'branches',
      header: 'Sedes que la ofrecen',
      render: (row) => (row.branchNames.length > 0 ? row.branchNames.join(', ') : '—'),
    },
    { key: 'createdBy', header: 'Agregada por', render: (row) => row.createdByName ?? '—' },
    {
      key: 'status',
      header: 'Estado',
      render: (row) => <StatusBadge label={row.active ? 'Activa' : 'Inactiva'} tone={row.active ? 'adm-active' : 'adm-inactive'} />,
    },
    ...(isAdminGlobal
      ? [
          {
            key: 'actions',
            header: '',
            render: (row: AdminSpecialty) =>
              confirmDeleteId === row.id ? (
                <div className="flex gap-1.5">
                  <Button
                    type="button"
                    variant="admin-danger"
                    size="xs"
                    disabled={busyId === row.id}
                    onClick={() => runAction(row.id, () => deleteSpecialty(row.id))}
                  >
                    Sí, borrar
                  </Button>
                  <Button type="button" variant="admin-outline" size="xs" onClick={() => setConfirmDeleteId(null)}>
                    No
                  </Button>
                </div>
              ) : (
                <div className="flex gap-1.5">
                  <Button type="button" variant="admin-outline" size="xs" icon={<Pencil size={13} />} onClick={() => openEditModal(row)}>
                    Editar
                  </Button>
                  <Button
                    type="button"
                    variant={row.active ? 'admin-danger' : 'admin-outline'}
                    size="xs"
                    disabled={busyId === row.id}
                    onClick={() => runAction(row.id, () => setSpecialtyActive(row.id, !row.active))}
                  >
                    {busyId === row.id ? 'Guardando…' : row.active ? 'Desactivar' : 'Activar'}
                  </Button>
                  <Button
                    type="button"
                    variant="admin-outline"
                    size="xs"
                    icon={<Trash2 size={13} />}
                    aria-label={`Borrar ${row.name}`}
                    onClick={() => setConfirmDeleteId(row.id)}
                  >
                    Borrar
                  </Button>
                </div>
              ),
          },
        ]
      : []),
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
          Agregar especialidad
        </Button>
      </div>

      <p className="text-[13px] text-adm-ink-400">
        Lista compartida por todas las sedes. {isAdminGlobal ? '' : 'Para renombrar o desactivar una especialidad, pídelo a la administración general.'}
      </p>

      <div className="flex flex-wrap items-center gap-2.5 rounded-[14px] border border-adm-line-card bg-white p-4">
        <SearchInput
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar especialidad..."
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
      ) : filtered.length === 0 ? (
        <EmptyState icon={Stethoscope} title="No hay especialidades registradas" description="Aún no se han agregado especialidades." />
      ) : (
        <DataTable columns={columns} rows={filtered} getRowId={(row) => row.id} />
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
