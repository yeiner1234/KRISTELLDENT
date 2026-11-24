import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MapPinPlus, Plus, UserRound } from 'lucide-react';
import SectionTitle from '../../components/common/SectionTitle';
import SearchInput from '../../components/common/SearchInput';
import Select from '../../components/common/Select';
import Button from '../../components/common/Button';
import EmptyState from '../../components/common/EmptyState';
import Spinner from '../../components/common/Spinner';
import FormError from '../../components/common/FormError';
import ProfessionalCard from '../../components/professionals/ProfessionalCard';
import ProfessionalScheduleModal from '../../components/professionals/ProfessionalScheduleModal';
import ProfessionalProfileModal from '../../components/professionals/ProfessionalProfileModal';
import AddProfessionalToBranchModal from '../../components/professionals/AddProfessionalToBranchModal';
import CreateProfessionalModal from '../../components/professionals/CreateProfessionalModal';
import { useAuth } from '../../hooks/useAuth';
import { useAdminProfessionals } from '../../hooks/useAdminProfessionals';
import { useAdminSpecialties } from '../../hooks/useAdminSpecialties';
import { useAdminBranches } from '../../hooks/useAdminBranches';
import { useAdminServices } from '../../hooks/useAdminServices';
import { useManageableBranchIds } from '../../hooks/useManageableBranchIds';
import { setProfessionalActive } from '../../services/professionalService';
import { activeBranchesOf } from '../../utils/professionalBranches';
import { professionalStatus, profileGaps, profileGapsSummary } from '../../utils/professionalProfile';

type OpenModal =
  | { kind: 'profile'; professionalId: string }
  | { kind: 'schedule'; professionalId: string; branchId?: string; returnToProfile: boolean }
  | { kind: 'add' }
  | { kind: 'create' };

// Profesionales (spec 10.4). Las sedes de una profesional se asignan aquí
// (professional_branches); la ficha tiene una pestaña por sede, y una
// admin_sede solo cambia lo de sus sedes.
function ProfessionalsPage() {
  const { user } = useAuth();
  const isAdminGlobal = user?.role === 'admin_global';
  const { professionals, isLoading: isLoadingProfessionals, error: professionalsError, refetch } = useAdminProfessionals();
  const { specialties, isLoading: isLoadingSpecialties, error: specialtiesError } = useAdminSpecialties();
  const { branches, isLoading: isLoadingBranches, error: branchesError } = useAdminBranches();
  const { services, isLoading: isLoadingServices, error: servicesError, refetch: refetchServices } = useAdminServices();
  // null = admin_global.
  const { branchIds: manageableBranchIds } = useManageableBranchIds();
  const canManageBranch = (branchId: string) => manageableBranchIds === null || manageableBranchIds.includes(branchId);
  const error = professionalsError ?? specialtiesError ?? branchesError ?? servicesError;
  const isLoading = isLoadingProfessionals || isLoadingSpecialties || isLoadingBranches || isLoadingServices;

  const [query, setQuery] = useState('');
  const [specialtyFilter, setSpecialtyFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  // "Ver ficha" desde Equipo llega con ?ficha=<id>.
  const [searchParams] = useSearchParams();
  const [modal, setModal] = useState<OpenModal | null>(() => {
    const fichaId = searchParams.get('ficha');
    return fichaId ? { kind: 'profile', professionalId: fichaId } : null;
  });
  const [modalKey, setModalKey] = useState(0);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [toggleError, setToggleError] = useState<string | null>(null);

  const open = (next: OpenModal) => {
    setModalKey((key) => key + 1);
    setModal(next);
  };

  const myBranches = useMemo(
    () => branches.filter((branch) => manageableBranchIds === null || manageableBranchIds.includes(branch.id)),
    [branches, manageableBranchIds],
  );
  const myActiveBranches = myBranches.filter((branch) => branch.active).map((branch) => ({ id: branch.id, name: branch.name }));

  // Una admin_sede ve las profesionales de sus sedes (y las que aún no tienen
  // ninguna, para poder completarles la ficha).
  const visible = useMemo(
    () =>
      manageableBranchIds === null
        ? professionals
        : professionals.filter(
            (professional) =>
              professional.branchIds.length === 0 || professional.branchIds.some((id) => manageableBranchIds.includes(id)),
          ),
    [professionals, manageableBranchIds],
  );

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return visible
      .filter((professional) => (specialtyFilter ? professional.specialtyIds.includes(specialtyFilter) : true))
      .filter((professional) => (branchFilter ? professional.branchIds.includes(branchFilter) : true))
      .filter((professional) => (term ? professional.fullName.toLowerCase().includes(term) : true));
  }, [query, specialtyFilter, branchFilter, visible]);

  const handleToggleActive = async (professionalId: string, nextActive: boolean) => {
    setTogglingId(professionalId);
    setToggleError(null);
    try {
      await setProfessionalActive(professionalId, nextActive);
      refetch();
    } catch (err) {
      setToggleError(err instanceof Error ? err.message : 'No se pudo actualizar el profesional.');
    } finally {
      setTogglingId(null);
    }
  };

  const current = modal && 'professionalId' in modal ? professionals.find((item) => item.id === modal.professionalId) : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionTitle title="Profesionales" align="left" />
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="admin-outline" size="sm" icon={<MapPinPlus size={16} />} onClick={() => open({ kind: 'add' })}>
            {isAdminGlobal ? 'Agregar profesional a una sede' : 'Agregar profesional a mi sede'}
          </Button>
          <Button type="button" variant="admin-solid" size="sm" icon={<Plus size={16} />} onClick={() => open({ kind: 'create' })}>
            Nuevo profesional
          </Button>
        </div>
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
            options={[
              { value: '', label: isAdminGlobal ? 'Todas las sedes' : 'Todas mis sedes' },
              ...myBranches.map((b) => ({ value: b.id, label: b.name })),
            ]}
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
            const specialtyName = specialties
              .filter((specialty) => professional.specialtyIds.includes(specialty.id))
              .map((specialty) => specialty.name)
              .join(', ');
            const branchNames = branches
              .filter((branch) => professional.branchIds.includes(branch.id))
              .map((branch) =>
                professional.inactiveBranchIds.includes(branch.id) ? `${branch.name} (desactivada)` : branch.name,
              )
              .join(', ');
            const gaps = profileGaps(professional, branches);

            return (
              <div key={professional.id} className="flex flex-col gap-2">
                <ProfessionalCard
                  professional={professional}
                  specialtyName={specialtyName || undefined}
                  meta={branchNames || 'Sin sedes'}
                  variant="admin"
                  agendaHref="/admin/agenda"
                  status={professionalStatus(professional)}
                  onEdit={() => open({ kind: 'profile', professionalId: professional.id })}
                  onSchedule={
                    activeBranchesOf(professional.branchIds, branches).length > 0
                      ? () => open({ kind: 'schedule', professionalId: professional.id, returnToProfile: false })
                      : undefined
                  }
                />
                {gaps.length > 0 && (
                  <p className="rounded-[10px] border border-adm-status-pending-border bg-adm-status-pending-bg px-3 py-2 text-[12.5px] text-adm-status-pending-text">
                    <span className="font-semibold">Ficha incompleta.</span> {profileGapsSummary(gaps)}
                  </p>
                )}
                {isAdminGlobal && (
                  <>
                    <Button
                      type="button"
                      variant={professional.active ? 'admin-danger' : 'admin-outline'}
                      size="xs"
                      disabled={togglingId === professional.id || (!professional.active && !professional.accountActive)}
                      onClick={() => handleToggleActive(professional.id, !professional.active)}
                    >
                      {togglingId === professional.id ? 'Guardando…' : professional.active ? 'Desactivar ficha' : 'Activar ficha'}
                    </Button>
                    {!professional.active && !professional.accountActive && (
                      <p className="text-[12.5px] text-adm-ink-400">Activa primero la cuenta en Equipo.</p>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {modal?.kind === 'profile' && current && (
        <ProfessionalProfileModal
          key={modalKey}
          professional={current}
          specialties={specialties}
          branches={branches}
          services={services}
          isAdminGlobal={isAdminGlobal}
          canManageBranch={canManageBranch}
          onClose={() => setModal(null)}
          onChanged={() => {
            refetch();
            refetchServices();
          }}
          onOpenSchedule={(branchId) =>
            open({ kind: 'schedule', professionalId: current.id, branchId, returnToProfile: true })
          }
        />
      )}

      {modal?.kind === 'schedule' && current && (
        <ProfessionalScheduleModal
          key={modalKey}
          professional={current}
          branches={branches}
          canManageBranch={canManageBranch}
          initialBranchId={modal.branchId}
          onSaved={refetch}
          onClose={() =>
            modal.returnToProfile ? open({ kind: 'profile', professionalId: current.id }) : setModal(null)
          }
        />
      )}

      {modal?.kind === 'add' && (
        <AddProfessionalToBranchModal
          key={modalKey}
          branches={myActiveBranches}
          onClose={() => setModal(null)}
          onAdded={refetch}
          onCreateNew={() => open({ kind: 'create' })}
        />
      )}

      {modal?.kind === 'create' && (
        <CreateProfessionalModal
          key={modalKey}
          specialties={specialties}
          branches={myActiveBranches}
          onClose={() => setModal(null)}
          onAddExisting={() => open({ kind: 'add' })}
          onCreated={() => {
            setModal(null);
            refetch();
          }}
        />
      )}
    </div>
  );
}

export default ProfessionalsPage;
