import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutGrid, Pencil, Plus, Trash2 } from 'lucide-react';
import SectionTitle from '../../components/common/SectionTitle';
import DataTable, { type DataTableColumn } from '../../components/common/DataTable';
import EmptyState from '../../components/common/EmptyState';
import Spinner from '../../components/common/Spinner';
import Select from '../../components/common/Select';
import Button from '../../components/common/Button';
import FormError from '../../components/common/FormError';
import ServiceFormModal, { type EditableService } from '../../components/services/ServiceFormModal';
import OfferStatusBadge from '../../components/services/OfferStatusBadge';
import { useAdminBranches } from '../../hooks/useAdminBranches';
import { useAdminSpecialties } from '../../hooks/useAdminSpecialties';
import { useOfferOverview, useOfferStatusOfBranches, useServicesWithoutBranch } from '../../hooks/useOffer';
import { assignServiceBranch, deleteService, setServiceActive } from '../../services/serviceService';
import { formatCurrency } from '../../utils/format';
import { professionalNames } from '../../utils/offer';
import type { ServiceOfferStatus } from '../../types/Offer';
import type { Service } from '../../types/Service';

type Row = ServiceOfferStatus & { branchId: string };
type StatusFilter = '' | 'visible' | 'hidden' | 'inactive';

// "Oferta por sede" (spec 10.2, solo admin_global): qué especialidades y
// servicios ofrece cada sede, todos los servicios con filtros, y los
// servicios viejos que la migración dejó sin sede.
function OfferOverviewPage() {
  const navigate = useNavigate();
  const { branches, isLoading: isLoadingBranches, error: branchesError } = useAdminBranches();
  const { specialties, refetch: refetchSpecialties } = useAdminSpecialties();
  const sortedBranches = useMemo(() => [...branches].sort((a, b) => a.name.localeCompare(b.name, 'es')), [branches]);
  const branchIds = useMemo(() => sortedBranches.map((branch) => branch.id), [sortedBranches]);

  const overview = useOfferOverview(true);
  const services = useOfferStatusOfBranches(branchIds);
  const orphans = useServicesWithoutBranch(true);

  const [branchFilter, setBranchFilter] = useState('');
  const [specialtyFilter, setSpecialtyFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('');
  const [modal, setModal] = useState<{ key: number; editing: EditableService | null; branchId: string } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [assignTo, setAssignTo] = useState<Record<string, string>>({});
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const reloadAll = () => {
    overview.refetch();
    services.refetch();
    orphans.refetch();
  };

  const matrixSpecialties = useMemo(() => {
    const byId = new Map(overview.data.map((cell) => [cell.specialtyId, cell.specialtyName]));
    return [...byId.entries()].sort((a, b) => a[1].localeCompare(b[1], 'es'));
  }, [overview.data]);

  const cellOf = (branchId: string, specialtyId: string) =>
    overview.data.find((cell) => cell.branchId === branchId && cell.specialtyId === specialtyId);

  const branchName = (id: string) => branches.find((branch) => branch.id === id)?.name ?? '—';

  const filteredRows = useMemo(
    () =>
      services.data
        .filter((row) => !branchFilter || row.branchId === branchFilter)
        .filter((row) => !specialtyFilter || row.specialtyId === specialtyFilter)
        .filter((row) => {
          if (statusFilter === 'visible') return row.active && row.bookable;
          if (statusFilter === 'hidden') return row.active && !row.bookable;
          if (statusFilter === 'inactive') return !row.active;
          return true;
        }),
    [services.data, branchFilter, specialtyFilter, statusFilter],
  );

  const runAction = async (id: string, action: () => Promise<unknown>) => {
    setBusyId(id);
    setActionError(null);
    try {
      await action();
      reloadAll();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'No se pudo completar la acción.');
    } finally {
      setBusyId(null);
    }
  };

  const columns: DataTableColumn<Row>[] = [
    { key: 'branch', header: 'Sede', render: (row) => branchName(row.branchId) },
    { key: 'name', header: 'Servicio', render: (row) => <span className="font-medium">{row.name}</span> },
    { key: 'specialty', header: 'Especialidad', render: (row) => row.specialtyName },
    { key: 'price', header: 'Precio', render: (row) => formatCurrency(row.price) },
    { key: 'duration', header: 'Duración', render: (row) => `${row.duration} min` },
    {
      key: 'professionals',
      header: 'Profesionales',
      render: (row) => <span className="block max-w-[200px] whitespace-normal">{professionalNames(row)}</span>,
    },
    { key: 'status', header: 'En la reserva', render: (row) => <OfferStatusBadge row={row} /> },
    {
      key: 'actions',
      header: '',
      render: (row) => (
        <div className="flex gap-1.5">
          <Button
            type="button"
            variant="admin-outline"
            size="xs"
            icon={<Pencil size={13} />}
            onClick={() =>
              setModal({
                key: Date.now(),
                branchId: row.branchId,
                editing: { id: row.serviceId, name: row.name, specialtyId: row.specialtyId, duration: row.duration, price: row.price },
              })
            }
          >
            Editar
          </Button>
          <Button
            type="button"
            variant={row.active ? 'admin-danger' : 'admin-outline'}
            size="xs"
            disabled={busyId === row.serviceId}
            onClick={() => runAction(row.serviceId, () => setServiceActive(row.serviceId, !row.active))}
          >
            {busyId === row.serviceId ? 'Guardando…' : row.active ? 'Desactivar' : 'Activar'}
          </Button>
        </div>
      ),
    },
  ];

  const orphanColumns: DataTableColumn<Service>[] = [
    { key: 'name', header: 'Servicio', render: (row) => <span className="font-medium">{row.name}</span> },
    {
      key: 'specialty',
      header: 'Especialidad',
      render: (row) => specialties.find((specialty) => specialty.id === row.specialtyId)?.name ?? '—',
    },
    { key: 'price', header: 'Precio', render: (row) => formatCurrency(row.price) },
    { key: 'duration', header: 'Duración', render: (row) => `${row.duration} min` },
    {
      key: 'assign',
      mobile: 'actions',
      header: 'Asignar a una sede',
      render: (row) => (
        <div className="flex items-end gap-1.5">
          <div className="min-w-0 flex-1 sm:w-[170px] sm:min-w-auto sm:flex-initial">
            <Select
              label={`Sede para ${row.name}`}
              hideLabel
              value={assignTo[row.id] ?? ''}
              onChange={(event) => setAssignTo((current) => ({ ...current, [row.id]: event.target.value }))}
              options={[{ value: '', label: 'Elige una sede' }, ...sortedBranches.map((b) => ({ value: b.id, label: b.name }))]}
            />
          </div>
          <Button
            type="button"
            variant="admin-outline"
            size="xs"
            disabled={!assignTo[row.id] || busyId === row.id}
            onClick={() => runAction(row.id, () => assignServiceBranch(row.id, assignTo[row.id]))}
          >
            Asignar
          </Button>
        </div>
      ),
    },
    {
      key: 'delete',
      header: '',
      render: (row) =>
        confirmDeleteId === row.id ? (
          <div className="flex gap-1.5">
            <Button
              type="button"
              variant="admin-danger"
              size="xs"
              disabled={busyId === row.id}
              onClick={() => runAction(row.id, () => deleteService(row.id)).then(() => setConfirmDeleteId(null))}
            >
              Sí, borrar
            </Button>
            <Button type="button" variant="admin-outline" size="xs" onClick={() => setConfirmDeleteId(null)}>
              No
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            variant="admin-outline"
            size="xs"
            icon={<Trash2 size={13} />}
            onClick={() => setConfirmDeleteId(row.id)}
          >
            Borrar
          </Button>
        ),
    },
  ];

  const isLoading = isLoadingBranches || overview.isLoading;
  const loadError = branchesError ?? overview.error;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionTitle title="Oferta por sede" align="left" />
        <Button
          type="button"
          variant="admin-solid"
          size="sm"
          icon={<Plus size={16} />}
          onClick={() => setModal({ key: Date.now(), editing: null, branchId: '' })}
        >
          Nuevo servicio
        </Button>
      </div>

      <FormError message={actionError} />

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Spinner size={28} />
        </div>
      ) : loadError ? (
        <EmptyState icon={LayoutGrid} title="No se pudo cargar la oferta" description={loadError} />
      ) : matrixSpecialties.length === 0 ? (
        <EmptyState icon={LayoutGrid} title="Ninguna sede tiene servicios todavía" description="Crea el primer servicio eligiendo la sede." />
      ) : (
        <section className="flex flex-col gap-2.5">
          <h2 className="text-[15px] font-semibold text-adm-ink-700">Servicios visibles en la reserva, por especialidad y sede</h2>
          <div className="overflow-x-auto rounded-2xl border border-adm-line-card bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-adm-line-div text-left text-[12.5px] text-adm-ink-400">
                  <th className="px-4 py-3 font-medium">Especialidad</th>
                  {sortedBranches.map((branch) => (
                    <th key={branch.id} className="px-4 py-3 text-center font-medium">
                      {branch.name}
                      {!branch.active && <span className="block text-[11px] font-normal">(inactiva)</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrixSpecialties.map(([specialtyId, specialtyName]) => (
                  <tr key={specialtyId} className="border-b border-adm-line-div last:border-0">
                    <td className="px-4 py-2.5 font-medium text-adm-ink-700">{specialtyName}</td>
                    {sortedBranches.map((branch) => {
                      const cell = cellOf(branch.id, specialtyId);
                      const label = cell && cell.bookableCount > 0 ? String(cell.bookableCount) : '—';
                      const detail = cell
                        ? `${cell.servicesCount} servicios, ${cell.bookableCount} visibles${
                            cell.minPrice !== null
                              ? `, ${formatCurrency(cell.minPrice)}${cell.maxPrice !== cell.minPrice && cell.maxPrice !== null ? ` a ${formatCurrency(cell.maxPrice)}` : ''}`
                              : ''
                          }`
                        : 'No la ofrece';
                      return (
                        <td key={branch.id} className="px-2 py-1.5 text-center">
                          <button
                            type="button"
                            title={detail}
                            aria-label={`${specialtyName} en ${branch.name}: ${detail}`}
                            onClick={() => navigate(`/admin/servicios?sede=${branch.id}&especialidad=${specialtyId}`)}
                            className={`w-full rounded-[8px] px-2 py-1.5 transition-colors hover:bg-adm-surface-hover ${
                              label === '—' ? 'text-adm-ink-300' : 'font-semibold text-adm-accent-deep'
                            }`}
                          >
                            {label}
                            {cell && cell.bookableCount === 0 && cell.servicesCount > 0 && (
                              <span className="block text-[11px] font-normal text-adm-danger-text">
                                {cell.servicesCount} sin publicar
                              </span>
                            )}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="flex flex-col gap-2.5">
        <h2 className="text-[15px] font-semibold text-adm-ink-700">Todos los servicios</h2>
        <div className="flex flex-wrap items-center gap-2.5 rounded-[14px] border border-adm-line-card bg-white p-4">
          <div className="w-full max-w-[200px]">
            <Select
              label="Filtrar por sede"
              hideLabel
              value={branchFilter}
              onChange={(event) => setBranchFilter(event.target.value)}
              options={[{ value: '', label: 'Todas las sedes' }, ...sortedBranches.map((b) => ({ value: b.id, label: b.name }))]}
            />
          </div>
          <div className="w-full max-w-[220px]">
            <Select
              label="Filtrar por especialidad"
              hideLabel
              value={specialtyFilter}
              onChange={(event) => setSpecialtyFilter(event.target.value)}
              options={[
                { value: '', label: 'Todas las especialidades' },
                ...specialties.map((specialty) => ({ value: specialty.id, label: specialty.name })),
              ]}
            />
          </div>
          <div className="w-full max-w-[220px]">
            <Select
              label="Filtrar por estado"
              hideLabel
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
              options={[
                { value: '', label: 'Todos los estados' },
                { value: 'visible', label: 'Visibles en reservas' },
                { value: 'hidden', label: 'Activos no visibles' },
                { value: 'inactive', label: 'Inactivos' },
              ]}
            />
          </div>
        </div>
        {services.isLoading ? (
          <div className="flex justify-center py-6">
            <Spinner size={24} />
          </div>
        ) : services.error ? (
          <EmptyState icon={LayoutGrid} title="No se pudieron cargar los servicios" description={services.error} />
        ) : filteredRows.length === 0 ? (
          <EmptyState icon={LayoutGrid} title="Sin servicios con ese filtro" description="Cambia los filtros o crea un servicio." />
        ) : (
          <DataTable columns={columns} rows={filteredRows} getRowId={(row) => row.serviceId} pageSize={12} />
        )}
      </section>

      {orphans.data.length > 0 && (
        <section className="flex flex-col gap-2.5">
          <h2 className="text-[15px] font-semibold text-adm-ink-700">Servicios sin sede</h2>
          <p className="text-[13px] text-adm-ink-400">
            Servicios del catálogo anterior que ninguna sede usaba. Asígnalos a la sede que los brinda (quedan
            inactivos hasta que los actives) o bórralos.
          </p>
          <DataTable columns={orphanColumns} rows={orphans.data} getRowId={(row) => row.id} />
        </section>
      )}

      {modal && (
        <ServiceFormModal
          key={modal.key}
          isOpen
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            reloadAll();
          }}
          editing={modal.editing}
          branchOptions={sortedBranches.map((branch) => ({ id: branch.id, name: branch.name }))}
          defaultBranchId={modal.branchId}
          specialties={specialties}
          onSpecialtyCreated={refetchSpecialties}
        />
      )}
    </div>
  );
}

export default OfferOverviewPage;
