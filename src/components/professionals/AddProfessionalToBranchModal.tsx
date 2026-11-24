import { useId, useState, type FormEvent } from 'react';
import { CheckCircle2, MapPin, Plus, Search, SearchX, UserPlus, UsersRound } from 'lucide-react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Select from '../common/Select';
import Spinner from '../common/Spinner';
import FormError from '../common/FormError';
import { searchProfessionalsDirectory } from '../../services/offerService';
import { addProfessionalToBranch } from '../../services/professionalService';
import type { DirectoryProfessional } from '../../types/Offer';

const roleLabels: Record<string, string> = {
  especialista: 'Especialista',
  odontologa_general: 'Odontóloga general',
  admin_sede: 'Administradora de sede',
};

function initials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?';
}

interface AddProfessionalToBranchModalProps {
  // Sedes donde quien agrega puede sumar profesionales (las suyas).
  branches: { id: string; name: string }[];
  onClose: () => void;
  onAdded: (professionalId: string) => void;
  onCreateNew: () => void;
}

// Busca en el directorio (search_professionals_directory: sin correo,
// teléfono ni citas) a una profesional que ya tiene ficha, aunque hoy atienda
// solo en otra sede, y la suma a una sede propia. La sincronización con Equipo
// la hace la base.
function AddProfessionalToBranchModal({ branches, onClose, onAdded, onCreateNew }: AddProfessionalToBranchModalProps) {
  const [query, setQuery] = useState('');
  const [searchedFor, setSearchedFor] = useState('');
  const [results, setResults] = useState<DirectoryProfessional[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [branchFor, setBranchFor] = useState<Record<string, string>>({});
  const [addingId, setAddingId] = useState<string | null>(null);
  const [added, setAdded] = useState<string | null>(null);
  const inputId = useId();

  const handleSearch = async (event: FormEvent) => {
    event.preventDefault();
    if (query.trim().length < 2) {
      setError('Escribe al menos 2 letras del nombre.');
      return;
    }
    setError(null);
    setAdded(null);
    setIsSearching(true);
    try {
      setResults(await searchProfessionalsDirectory(query));
      setSearchedFor(query.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo buscar.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleAdd = async (professional: DirectoryProfessional, branchId: string) => {
    setError(null);
    setAddingId(professional.id);
    try {
      await addProfessionalToBranch(professional.id, branchId);
      const branchName = branches.find((branch) => branch.id === branchId)?.name ?? '';
      setAdded(`${professional.fullName} ahora atiende también en ${branchName}. Elige sus servicios y su horario en su ficha.`);
      setResults((current) =>
        current?.map((item) =>
          item.id === professional.id
            ? { ...item, branchIds: [...item.branchIds, branchId], branchNames: [...item.branchNames, branchName] }
            : item,
        ) ?? null,
      );
      onAdded(professional.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo agregar a la sede.');
    } finally {
      setAddingId(null);
    }
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Agregar profesional a mi sede"
      maxWidth="max-w-[600px]"
      footer={
        <Button type="button" variant="admin-outline" onClick={onClose}>
          Cerrar
        </Button>
      }
    >
      <div className="flex flex-col gap-4 py-3">
        <div className="flex items-start gap-3 rounded-[12px] bg-brand-50 p-3.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-brand-600 shadow-soft">
            <UserPlus size={18} />
          </span>
          <p className="text-sm leading-[1.5] text-adm-ink-700">
            <span className="font-semibold text-brand-900">Suma a una profesional que ya trabaja en la clínica.</span> Búscala por
            su nombre y elige la sede donde también atenderá.
          </p>
        </div>

        <form onSubmit={handleSearch} className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <label htmlFor={inputId} className="text-sm font-medium text-adm-ink-700">
              Nombre de la profesional
            </label>
            <div className="flex h-11 items-center gap-2.5 rounded-[10px] border border-adm-line-field bg-adm-surface-input px-3.5 transition-colors focus-within:border-brand-600 focus-within:bg-white focus-within:ring-2 focus-within:ring-adm-accent-ring">
              <Search size={17} strokeWidth={1.75} className="shrink-0 text-adm-ink-300" />
              <input
                id={inputId}
                name="directorio"
                type="search"
                autoComplete="off"
                placeholder="Ej.: Carla, Díaz…"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="h-full w-full min-w-0 bg-transparent text-base text-adm-ink-700 outline-none placeholder:text-adm-ink-200 sm:text-sm"
              />
            </div>
          </div>
          <Button type="submit" variant="admin-solid" className="h-11 w-full sm:w-auto" disabled={isSearching}>
            Buscar
          </Button>
        </form>

        <FormError message={error} />
        {added && (
          <p className="flex items-start gap-2.5 rounded-[10px] border border-adm-status-confirmed-border bg-adm-status-confirmed-bg px-3.5 py-2.5 text-sm font-medium text-adm-status-confirmed-text">
            <CheckCircle2 size={18} className="mt-px shrink-0" />
            {added}
          </p>
        )}

        {isSearching ? (
          <div className="flex items-center justify-center gap-2.5 py-8 text-sm text-adm-ink-400">
            <Spinner size={22} />
            Buscando…
          </div>
        ) : results === null ? (
          <div className="flex flex-col items-center gap-2 rounded-[12px] border border-dashed border-adm-line-field px-4 py-7 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-adm-surface-hover text-adm-ink-300">
              <UsersRound size={20} />
            </span>
            <p className="text-sm text-adm-ink-400">Escribe su nombre y pulsa Buscar. Verás en qué sedes atiende hoy.</p>
          </div>
        ) : results.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-[12px] border border-dashed border-adm-line-field px-4 py-7 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-adm-status-pending-bg text-adm-status-pending-text">
              <SearchX size={20} />
            </span>
            <p className="text-sm font-medium text-adm-ink-700">No encontramos a nadie llamado “{searchedFor}”.</p>
            <p className="text-sm text-adm-ink-400">Revisa cómo está escrito o prueba solo con el apellido.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <p className="text-[13px] font-medium text-adm-ink-400">
              {results.length === 1 ? '1 profesional encontrada' : `${results.length} profesionales encontradas`}
            </p>
            <ul className="flex flex-col gap-2.5">
              {results.map((professional) => {
                const available = branches.filter((branch) => !professional.branchIds.includes(branch.id));
                const chosen = branchFor[professional.id] ?? available[0]?.id ?? '';
                return (
                  <li
                    key={professional.id}
                    className="flex flex-col gap-3 rounded-[12px] border border-adm-line-card bg-white p-3.5 shadow-soft"
                  >
                    <div className="flex items-start gap-3">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#dceef0] text-sm font-semibold text-adm-accent-deep">
                        {initials(professional.fullName)}
                      </span>
                      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                        <p className="text-[15px] font-semibold text-adm-ink-700">{professional.fullName}</p>
                        <div className="flex flex-wrap gap-1.5">
                          <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-700">
                            {roleLabels[professional.role] ?? professional.role}
                          </span>
                          {professional.specialtyNames.map((name) => (
                            <span
                              key={name}
                              className="rounded-full border border-adm-line-card bg-adm-surface-hover px-2.5 py-0.5 text-xs font-medium text-adm-ink-700"
                            >
                              {name}
                            </span>
                          ))}
                        </div>
                        <p className="flex items-start gap-1.5 text-[13px] text-adm-ink-400">
                          <MapPin size={14} className="mt-0.5 shrink-0" />
                          <span>
                            Atiende en:{' '}
                            <span className="font-medium text-adm-ink-700">
                              {professional.branchNames.length > 0 ? professional.branchNames.join(', ') : 'ninguna sede'}
                            </span>
                          </span>
                        </p>
                      </div>
                    </div>

                    {available.length === 0 ? (
                      <p className="flex items-center gap-1.5 self-start rounded-full bg-adm-status-confirmed-bg px-3 py-1 text-[13px] font-medium text-adm-status-confirmed-text">
                        <CheckCircle2 size={15} />
                        Ya atiende en tus sedes
                      </p>
                    ) : (
                      <div className="flex flex-col gap-2 border-t border-adm-line-div pt-3 sm:flex-row sm:items-center sm:justify-end">
                        {available.length > 1 && (
                          <div className="w-full sm:w-[200px]">
                            <Select
                              label={`Sede para ${professional.fullName}`}
                              hideLabel
                              value={chosen}
                              onChange={(event) =>
                                setBranchFor((current) => ({ ...current, [professional.id]: event.target.value }))
                              }
                              options={available.map((branch) => ({ value: branch.id, label: branch.name }))}
                            />
                          </div>
                        )}
                        <Button
                          type="button"
                          variant="admin-solid"
                          className="w-full sm:w-auto"
                          icon={<UserPlus size={16} />}
                          disabled={addingId === professional.id}
                          onClick={() => handleAdd(professional, chosen)}
                        >
                          {addingId === professional.id
                            ? 'Agregando…'
                            : `Agregar a ${available.find((branch) => branch.id === chosen)?.name ?? 'mi sede'}`}
                        </Button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <div className="flex flex-col gap-3 rounded-[12px] bg-adm-surface-hover p-3.5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[13px] leading-[1.5] text-adm-ink-400">
            <span className="font-semibold text-adm-ink-700">¿No la encuentras?</span> Si ya tiene cuenta pero aún no tiene
            ficha, créala aquí. Si no tiene cuenta, invítala desde Equipo.
          </p>
          <Button
            type="button"
            variant="admin-outline"
            size="sm"
            className="w-full shrink-0 sm:w-auto"
            icon={<Plus size={15} />}
            onClick={onCreateNew}
          >
            Nuevo profesional
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default AddProfessionalToBranchModal;
