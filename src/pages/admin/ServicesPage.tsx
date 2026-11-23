import { useMemo, useState, type FormEvent } from 'react';
import { ClipboardList, Pencil, Plus } from 'lucide-react';
import SectionTitle from '../../components/common/SectionTitle';
import { useAuth } from '../../hooks/useAuth';
import DataTable, { type DataTableColumn } from '../../components/common/DataTable';
import EmptyState from '../../components/common/EmptyState';
import Spinner from '../../components/common/Spinner';
import SearchInput from '../../components/common/SearchInput';
import Select from '../../components/common/Select';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import FormError from '../../components/common/FormError';
import Input from '../../components/common/Input';
import StatusBadge from '../../components/common/StatusBadge';
import { useAdminServices } from '../../hooks/useAdminServices';
import { useAdminSpecialties } from '../../hooks/useAdminSpecialties';
import { createService, setServiceActive, updateService, type ServiceInput } from '../../services/serviceService';
import { formatCurrency } from '../../utils/format';
import { groupServicesBySpecialty } from '../../utils/serviceGroups';
import type { Service } from '../../types/Service';

function emptyForm(defaultSpecialtyId: string): ServiceInput {
  return { name: '', specialtyId: defaultSpecialtyId, duration: 30, price: 0 };
}

function ServicesPage() {
  const { user } = useAuth();
  // admin_sede ve el catálogo en solo lectura: solo admin_global lo edita.
  const isAdminGlobal = user?.role === 'admin_global';
  const { services, isLoading: isLoadingServices, error: servicesError, refetch } = useAdminServices();
  const { specialties, isLoading: isLoadingSpecialties, error: specialtiesError } = useAdminSpecialties();
  const error = servicesError ?? specialtiesError;
  const [query, setQuery] = useState('');
  const [specialtyId, setSpecialtyId] = useState('');
  const isLoading = isLoadingServices || isLoadingSpecialties;

  const activeSpecialties = useMemo(() => specialties.filter((specialty) => specialty.active), [specialties]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [form, setForm] = useState<ServiceInput>(emptyForm(''));
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [toggleError, setToggleError] = useState<string | null>(null);

  const openCreateModal = () => {
    setEditing(null);
    setForm(emptyForm(activeSpecialties[0]?.id ?? ''));
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (service: Service) => {
    setEditing(service);
    setForm({ name: service.name, specialtyId: service.specialtyId, duration: service.duration, price: service.price });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);

    if (!form.specialtyId) {
      setFormError('Selecciona una especialidad.');
      return;
    }

    setIsSubmitting(true);

    try {
      if (editing) {
        await updateService(editing.id, form);
      } else {
        await createService(form);
      }
      setIsModalOpen(false);
      refetch();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'No se pudo guardar el servicio.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (service: Service) => {
    setTogglingId(service.id);
    setToggleError(null);
    try {
      await setServiceActive(service.id, !service.active);
      refetch();
    } catch (err) {
      setToggleError(err instanceof Error ? err.message : 'No se pudo actualizar el servicio.');
    } finally {
      setTogglingId(null);
    }
  };

  const allColumns: DataTableColumn<Service>[] = [
    { key: 'name', header: 'Servicio', render: (row) => row.name },
    { key: 'duration', header: 'Duración', render: (row) => `${row.duration} min` },
    { key: 'price', header: 'Precio', render: (row) => formatCurrency(row.price) },
    {
      key: 'status',
      header: 'Estado',
      render: (row) => <StatusBadge label={row.active ? 'Activo' : 'Inactivo'} tone={row.active ? 'adm-active' : 'adm-inactive'} />,
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
  const columns = isAdminGlobal ? allColumns : allColumns.filter((column) => column.key !== 'actions');

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return services
      .filter((service) => (specialtyId ? service.specialtyId === specialtyId : true))
      .filter((service) => (term ? service.name.toLowerCase().includes(term) : true));
  }, [query, specialtyId, services]);

  // Agrupa lo que ya pasó el filtro y la búsqueda.
  const groups = useMemo(() => groupServicesBySpecialty(filtered, specialties), [filtered, specialties]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionTitle title="Servicios" align="left" />
        {isAdminGlobal && (
          <Button type="button" variant="admin-solid" size="sm" icon={<Plus size={16} />} onClick={openCreateModal}>
            Nuevo servicio
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2.5 rounded-[14px] border border-adm-line-card bg-white p-4">
        <SearchInput
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar servicio..."
          wrapperClassName="min-w-[180px] flex-1"
        />
        <div className="w-full max-w-[220px]">
          <Select
            label="Especialidad"
            hideLabel
            value={specialtyId}
            onChange={(event) => setSpecialtyId(event.target.value)}
            options={[{ value: '', label: 'Todas las especialidades' }, ...specialties.map((s) => ({ value: s.id, label: s.name }))]}
          />
        </div>
      </div>

      <FormError message={toggleError} />

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Spinner size={28} />
        </div>
      ) : error ? (
        <EmptyState icon={ClipboardList} title="No se pudieron cargar los servicios" description={error} />
      ) : filtered.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No hay servicios registrados" description="Aún no se han creado servicios." />
      ) : (
        <div className="flex flex-col gap-6">
          {groups.map((group) => (
            <section key={group.key} className="flex flex-col gap-2.5">
              <h2 className="flex items-baseline gap-2 text-[15px] font-semibold text-adm-ink-700">
                {group.title}
                <span className="text-[13px] font-normal text-adm-ink-400">
                  {group.services.length} {group.services.length === 1 ? 'servicio' : 'servicios'}
                </span>
              </h2>
              <DataTable columns={columns} rows={group.services} getRowId={(row) => row.id} />
            </section>
          ))}
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editing ? 'Editar servicio' : 'Nuevo servicio'}
        footer={
          <>
            <Button type="button" variant="admin-outline" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="servicio-form" variant="admin-solid" disabled={isSubmitting || activeSpecialties.length === 0}>
              {isSubmitting ? 'Guardando…' : 'Guardar'}
            </Button>
          </>
        }
      >
        <form id="servicio-form" onSubmit={handleSubmit} className="flex flex-col gap-4 py-2">
          {formError && (
            <p className="rounded-[10px] border border-adm-status-cancelled-border bg-adm-status-cancelled-bg px-3.5 py-2.5 text-sm font-medium text-adm-danger-text">
              {formError}
            </p>
          )}

          <Input
            label="Nombre del servicio"
            name="name"
            variant="admin"
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            required
          />

          {activeSpecialties.length === 0 ? (
            <p className="text-sm text-adm-ink-400">
              No hay especialidades activas. Crea una especialidad primero.
            </p>
          ) : (
            <Select
              label="Especialidad"
              value={form.specialtyId}
              onChange={(event) => setForm((current) => ({ ...current, specialtyId: event.target.value }))}
              options={activeSpecialties.map((specialty) => ({ value: specialty.id, label: specialty.name }))}
            />
          )}

          <Input
            label="Duración (minutos)"
            name="duration"
            type="number"
            min={1}
            variant="admin"
            value={form.duration}
            onChange={(event) => setForm((current) => ({ ...current, duration: Number(event.target.value) }))}
            required
          />
          <Input
            label="Precio (S/)"
            name="price"
            type="number"
            min={0}
            step="0.01"
            variant="admin"
            value={form.price}
            onChange={(event) => setForm((current) => ({ ...current, price: Number(event.target.value) }))}
            required
          />
        </form>
      </Modal>
    </div>
  );
}

export default ServicesPage;
