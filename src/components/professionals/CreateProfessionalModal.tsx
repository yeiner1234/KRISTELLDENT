import { useEffect, useState, type FormEvent } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Select from '../common/Select';
import Spinner from '../common/Spinner';
import FormError from '../common/FormError';
import {
  createProfessional,
  getEligibleProfilesForProfessional,
  type EligibleProfile,
} from '../../services/professionalService';
import type { Specialty } from '../../types/Specialty';

interface CreateProfessionalModalProps {
  specialties: Specialty[];
  // Sedes activas que quien crea administra.
  branches: { id: string; name: string }[];
  onClose: () => void;
  onCreated: () => void;
}

function toggle(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter((item) => item !== id) : [...list, id];
}

// Ficha para una cuenta de especialista u odontóloga general que todavía no la
// tiene. Los servicios y el horario se eligen después, en su ficha, por sede.
function CreateProfessionalModal({ specialties, branches, onClose, onCreated }: CreateProfessionalModalProps) {
  const [profiles, setProfiles] = useState<EligibleProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [profileId, setProfileId] = useState('');
  const [bio, setBio] = useState('');
  const [specialtyIds, setSpecialtyIds] = useState<string[]>([]);
  const [branchIds, setBranchIds] = useState<string[]>(branches.length === 1 ? [branches[0].id] : []);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;
    getEligibleProfilesForProfessional()
      .then((data) => isMounted && setProfiles(data))
      .catch((err) => isMounted && setError(err instanceof Error ? err.message : 'No se pudieron cargar las cuentas disponibles.'))
      .finally(() => isMounted && setIsLoading(false));
    return () => {
      isMounted = false;
    };
  }, []);

  const role = profiles.find((profile) => profile.id === profileId)?.role ?? null;
  const isSpecialist = role === 'especialista';
  const activeSpecialties = specialties.filter((specialty) => specialty.active);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!profileId) {
      setError('Selecciona la cuenta del profesional.');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await createProfessional({ profileId, bio: bio.trim() ? bio.trim() : null, specialtyIds, branchIds });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la ficha.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Nuevo profesional"
      maxWidth="max-w-[520px]"
      footer={
        <>
          <Button type="button" variant="admin-outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="nuevo-profesional-form" variant="admin-solid" disabled={isSubmitting}>
            {isSubmitting ? 'Guardando…' : 'Crear ficha'}
          </Button>
        </>
      }
    >
      <form id="nuevo-profesional-form" onSubmit={handleSubmit} className="flex flex-col gap-4 py-2">
        <FormError message={error} />

        {isLoading ? (
          <Spinner size={20} />
        ) : profiles.length === 0 ? (
          <p className="text-sm text-adm-ink-400">
            No hay cuentas de especialista u odontóloga general sin ficha. Invita una desde "Equipo" (se crea con su
            ficha) o, si ya atiende en otra sede, usa "Agregar profesional a mi sede".
          </p>
        ) : (
          <Select
            label="Cuenta del profesional"
            value={profileId}
            onChange={(event) => {
              setProfileId(event.target.value);
              setSpecialtyIds([]);
            }}
            options={[
              { value: '', label: 'Selecciona una cuenta' },
              ...profiles.map((profile) => ({
                value: profile.id,
                label: `${profile.fullName} (${profile.email}) · ${
                  profile.role === 'odontologa_general' ? 'Odontóloga general' : 'Especialista'
                }`,
              })),
            ]}
          />
        )}

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-adm-ink-700" htmlFor="nuevo-bio">
            Bio (opcional)
          </label>
          <textarea
            id="nuevo-bio"
            className="min-h-[70px] rounded-[10px] border border-adm-line-field bg-adm-surface-input px-3.5 py-2.5 text-sm text-adm-ink-700 outline-none focus:border-brand-600 focus:bg-white focus:ring-2 focus:ring-adm-accent-ring"
            value={bio}
            onChange={(event) => setBio(event.target.value)}
          />
        </div>

        {profileId && (
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-adm-ink-700">{isSpecialist ? 'Especialidad' : 'Especialidades'}</span>
            <div className="flex max-h-[180px] flex-col gap-1.5 overflow-y-auto rounded-[10px] border border-adm-line-field p-3">
              {activeSpecialties.map((specialty) => (
                <label key={specialty.id} className="flex items-center gap-2 text-sm text-adm-ink-700">
                  <input
                    type={isSpecialist ? 'radio' : 'checkbox'}
                    name="nuevo-especialidad"
                    className="h-[15px] w-[15px] accent-brand-600"
                    checked={specialtyIds.includes(specialty.id)}
                    onChange={() => setSpecialtyIds((current) => (isSpecialist ? [specialty.id] : toggle(current, specialty.id)))}
                  />
                  {specialty.name}
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-adm-ink-700">Sedes donde atiende</span>
          {branches.length === 0 ? (
            <p className="text-sm text-adm-ink-400">No administras ninguna sede activa.</p>
          ) : (
            <div className="flex flex-col gap-1.5 rounded-[10px] border border-adm-line-field p-3">
              {branches.map((branch) => (
                <label key={branch.id} className="flex items-center gap-2 text-sm text-adm-ink-700">
                  <input
                    type="checkbox"
                    className="h-[15px] w-[15px] accent-brand-600"
                    checked={branchIds.includes(branch.id)}
                    onChange={() => setBranchIds((current) => toggle(current, branch.id))}
                  />
                  {branch.name}
                </label>
              ))}
            </div>
          )}
        </div>
      </form>
    </Modal>
  );
}

export default CreateProfessionalModal;
