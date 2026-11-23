import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ClipboardList, Pencil, Plus } from 'lucide-react';
import SectionTitle from '../../components/common/SectionTitle';
import DataTable, { type DataTableColumn } from '../../components/common/DataTable';
import EmptyState from '../../components/common/EmptyState';
import Spinner from '../../components/common/Spinner';
import SearchInput from '../../components/common/SearchInput';
import Select from '../../components/common/Select';
import Button from '../../components/common/Button';
import FormError from '../../components/common/FormError';
import StatusBadge from '../../components/common/StatusBadge';
import ServiceFormModal, { type EditableService } from '../../components/services/ServiceFormModal';
import OfferStatusBadge from '../../components/services/OfferStatusBadge';
import { useAdminBranches } from '../../hooks/useAdminBranches';
import { useAdminSpecialties } from '../../hooks/useAdminSpecialties';
import { useManageableBranchIds } from '../../hooks/useManageableBranchIds';
import { useBranchOfferStatus } from '../../hooks/useOffer';
import { setServiceActive } from '../../services/serviceService';
import { formatCurrency } from '../../utils/format';
import { professionalNames } from '../../utils/offer';
import type { ServiceOfferStatus } from '../../types/Offer';

interface Group {
  key: string;
  title: string;
  rows: ServiceOfferStatus[];
}

function groupBySpecialty(rows: ServiceOfferStatus[]): Group[] {
  const groups = new Map<string, Group>();
  for (const row of rows) {
    const group = groups.get(row.specialtyId) ?? { key: row.specialtyId, title: row.specialtyName, rows: [] };
    group.rows.push(row);
    groups.set(row.specialtyId, group);
  }
  return [...groups.values()].sort((a, b) => a.title.localeCompare(b.title, 'es'));
}

// "Servicios de la sede" (spec 10.1): cada sede declara sus servicios, con su
// precio y duración. admin_sede elige entre sus sedes; admin_global, entre
// todas. ?sede= y ?especialidad= llegan desde "Oferta por sede".
function ServicesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { branches, isLoading: isLoadingBranches, error: branchesError } = useAdminBranches();
  const { branchIds: manageableIds, isLoading: isLoadingAccess, error: accessError } = useManageableBranchIds();
  const { specialties, refetch: refetchSpecialties } = useAdminSpecialties();

  const branchOptions = useMemo(
    () =>
      branches
        .filter((branch) => manageableIds === null || manageableIds.includes(branch.id))
        .map((branch) => ({ id: branch.id, name: branch.active ? branch.name : `${branch.name} (inactiva)` })),
    [branches, manageableIds],
  );

  const requestedBranchId = searchParams.get('sede') ?? '';
  const branchId = branchOptions.some((branch) => branch.id === requestedBranchId)
    ? requestedBranchId
    : (branchOptions[0]?.id ?? '');
  const specialtyFilter = searchParams.get('especialidad') ?? '';

  const { data: rows, isLoading: isLoadingRows, error: rowsError, refetch } = useBranchOfferStatus(branchId || null);
  const [query, setQuery] = useState('');
  const [modal, setModal] = useState<{ key: number; editing: EditableService | null } | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [toggleError, setToggleError] = useState<string | null>(null);

  const setParam = (name: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(name, value);
    else next.delete(name);
    setSearchParams(next, { replace: true });
  };

  const branchSpecialties = useMemo(
    () => [...new Set(rows.filter((row) => row.bookable).map((row) => row.specialtyName))].sort((a, b) => a.localeCompare(b, 'es')),
    [rows],
  );

  const groups = useMemo(() => {
    const term = query.trim().toLowerCase();
    return groupBySpecialty(
      rows
        .filter((row) => !specialtyFilter || row.specialtyId === specialtyFilter)
        .filter((row) => !term || row.name.toLowerCase().includes(term)),
    );
  }, [rows, specialtyFilter, query]);

  const specialtyOptions = useMemo(() => {
    const seen = new Map(rows.map((row) => [row.specialtyId, row.specialtyName]));
    return [...seen.entries()].sort((a, b) => a[1].localeCompare(b[1], 'es'));
  }, [rows]);

  const handleToggle = async (row: ServiceOfferStatus) => {
    setTogglingId(row.serviceId);
    setToggleError(null);
    try {
      await setServiceActive(row.serviceId, !row.active);
      refetch();
    } catch (err) {
      setToggleError(err instanceof Error ? err.message : 'No se pudo actualizar el servicio.');
    } finally {
      setTogglingId(null);
    }
  };

  const columns: DataTableColumn<ServiceOfferStatus>[] = [
    { key: 'name', header: 'Servicio', render: (row) => <span className="font-medium">{row.name}</span> },
    { key: 'price', header: 'Precio', render: (row) => formatCurrency(row.price) },
    { key: 'duration', header: 'Duración', render: (row) => `${row.duration} min` },
    {
      key: 'professionals',
      header: 'Profesionales',
      render: (row) => <span className="block max-w-[220px] whitespace-normal">{professionalNames(row)}</span>,
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
            aria-label={`Editar ${row.name}`}
            onClick={() =>
              setModal({
                key: Date.now(),
                editing: {
                  id: row.serviceId,
                  name: row.name,
                  specialtyId: row.specialtyId,
                  duration: row.duration,
                  price: row.price,
                },
              })
            }
          >
            Editar
          </Button>
          <Button
            type="button"
            variant={row.active ? 'admin-danger' : 'admin-outline'}
            size="xs"
            disabled={togglingId === row.serviceId}
            onClick={() => handleToggle(row)}
          >
            {togglingId === row.serviceId ? 'Guardando…' : row.active ? 'Desactivar' : 'Activar'}
          </Button>
        </div>
      ),
    },
  ];

  const isLoading = isLoadingBranches || isLoadingAccess || isLoadingRows;
  const loadError = branchesError ?? accessError ?? rowsError;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionTitle title="Servicios de la sede" align="left" />
        {branchId && (
          <Button
            type="button"
            variant="admin-solid"
            size="sm"
            icon={<Plus size={16} />}
            onClick={() => setModal({ key: Date.now(), editing: null })}
          >
            Nuevo servicio
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2.5 rounded-[14px] border border-adm-line-card bg-white p-4">
        <div className="w-full max-w-[240px]">
          <Select
            label="Sede"
            hideLabel
            value={branchId}
            onChange={(event) => setParam('sede', event.target.value)}
            options={branchOptions.map((branch) => ({ value: branch.id, label: branch.name }))}
          />
        </div>
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
            value={specialtyFilter}
            onChange={(event) => setParam('especialidad', event.target.value)}
            options={[
              { value: '', label: 'Todas las especialidades' },
              ...specialtyOptions.map(([id, name]) => ({ value: id, label: name })),
            ]}
          />
        </div>
      </div>

      {branchId && !isLoading && !loadError && (
        <div className="flex flex-col gap-2 rounded-[14px] border border-adm-line-card bg-white p-4">
          <p className="text-sm font-semibold text-adm-ink-700">Especialidades de esta sede</p>
          {branchSpecialties.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {branchSpecialties.map((name) => (
                <StatusBadge key={name} label={name} tone="brand" />
              ))}
            </div>
          ) : (
            <p className="text-[13px] text-adm-ink-400">
              Todavía ninguna. Una especialidad aparece en la reserva cuando la sede tiene un servicio activo de ella con
              una profesional asignada que tiene horario aquí.
            </p>
          )}
        </div>
      )}

      <FormError message={toggleError} />

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Spinner size={28} />
        </div>
      ) : loadError ? (
        <EmptyState icon={ClipboardList} title="No se pudieron cargar los servicios" description={loadError} />
      ) : !branchId ? (
        <EmptyState icon={ClipboardList} title="No tienes sedes asignadas" description="Pide a la administración general que te asigne una sede." />
      ) : groups.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Esta sede aún no tiene servicios"
          description="Crea los servicios que brinda esta sede con su precio y duración."
        />
      ) : (
        <div className="flex flex-col gap-6">
          {groups.map((group) => (
            <section key={group.key} className="flex flex-col gap-2.5">
              <h2 className="flex items-baseline gap-2 text-[15px] font-semibold text-adm-ink-700">
                {group.title}
                <span className="text-[13px] font-normal text-adm-ink-400">
                  {group.rows.length} {group.rows.length === 1 ? 'servicio' : 'servicios'}
                </span>
              </h2>
              <DataTable columns={columns} rows={group.rows} getRowId={(row) => row.serviceId} />
            </section>
          ))}
        </div>
      )}

      {modal && (
        <ServiceFormModal
          key={modal.key}
          isOpen
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            refetch();
          }}
          editing={modal.editing}
          branchOptions={branchOptions.filter((branch) => branch.id === branchId)}
          defaultBranchId={branchId}
          specialties={specialties}
          onSpecialtyCreated={refetchSpecialties}
        />
      )}
    </div>
  );
}

export default ServicesPage;
