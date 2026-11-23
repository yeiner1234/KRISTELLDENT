import { useState, type FormEvent } from 'react';
import { Search } from 'lucide-react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Input from '../common/Input';
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
  const [results, setResults] = useState<DirectoryProfessional[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [branchFor, setBranchFor] = useState<Record<string, string>>({});
  const [addingId, setAddingId] = useState<string | null>(null);
  const [added, setAdded] = useState<string | null>(null);

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
      <div className="flex flex-col gap-4 py-2">
        <form onSubmit={handleSearch} className="flex items-end gap-2">
          <Input
            label="Nombre de la profesional"
            name="directorio"
            variant="admin"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="flex-1"
          />
          <Button type="submit" variant="admin-outline" icon={<Search size={14} />} className="h-[42px]" disabled={isSearching}>
            Buscar
          </Button>
        </form>

        <FormError message={error} />
        {added && (
          <p className="rounded-[10px] border border-adm-status-confirmed-border bg-adm-status-confirmed-bg px-3.5 py-2.5 text-sm font-medium text-adm-status-confirmed-text">
            {added}
          </p>
        )}

        {isSearching ? (
          <div className="flex justify-center py-6">
            <Spinner size={24} />
          </div>
        ) : results && results.length === 0 ? (
          <p className="text-sm text-adm-ink-400">No se encontró a nadie con ese nombre.</p>
        ) : (
          results && (
            <ul className="flex flex-col divide-y divide-adm-line-div rounded-[10px] border border-adm-line-field">
              {results.map((professional) => {
                const available = branches.filter((branch) => !professional.branchIds.includes(branch.id));
                const chosen = branchFor[professional.id] ?? available[0]?.id ?? '';
                return (
                  <li key={professional.id} className="flex flex-col gap-2 p-3">
                    <div>
                      <p className="text-sm font-semibold text-adm-ink-700">{professional.fullName}</p>
                      <p className="text-[12.5px] text-adm-ink-400">
                        {roleLabels[professional.role] ?? professional.role}
                        {professional.specialtyNames.length > 0 && ` · ${professional.specialtyNames.join(', ')}`}
                      </p>
                      <p className="text-[12.5px] text-adm-ink-400">
                        Atiende en: {professional.branchNames.length > 0 ? professional.branchNames.join(', ') : 'ninguna sede'}
                      </p>
                    </div>
                    {available.length === 0 ? (
                      <p className="text-[12.5px] italic text-adm-ink-300">Ya atiende en tus sedes.</p>
                    ) : (
                      <div className="flex items-end gap-2">
                        {available.length > 1 && (
                          <div className="w-[200px]">
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
                          size="xs"
                          className="h-9"
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
          )
        )}

        <p className="text-[12.5px] text-adm-ink-400">
          ¿No la encuentras? Si ya tiene cuenta pero aún no tiene ficha,{' '}
          <button type="button" onClick={onCreateNew} className="font-medium text-adm-accent-deep hover:underline">
            créala en "Nuevo profesional"
          </button>
          . Si no tiene cuenta, invítala desde Equipo.
        </p>
      </div>
    </Modal>
  );
}

export default AddProfessionalToBranchModal;
