import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Check, IdCard, MapPin, MapPinPlus, UserRoundPlus, UsersRound } from 'lucide-react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Select from '../common/Select';
import Spinner from '../common/Spinner';
import FormError from '../common/FormError';
import InfoCallout from '../common/InfoCallout';
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
  // Sin cuentas disponibles: lleva a "Agregar profesional a mi sede".
  onAddExisting?: () => void;
}

const roleLabel = (role: EligibleProfile['role']) => (role === 'odontologa_general' ? 'Odontóloga general' : 'Especialista');

function toggle(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter((item) => item !== id) : [...list, id];
}

function initials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?';
}

// Paso numerado del formulario: número, título y una ayuda corta.
function Step({ number, title, hint, children }: { number: number; title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2.5">
      <div className="flex items-start gap-2.5">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white">
          {number}
        </span>
        <div className="flex flex-col">
          <h4 className="text-sm font-semibold text-adm-ink-700">{title}</h4>
          {hint && <p className="text-[13px] text-adm-ink-400">{hint}</p>}
        </div>
      </div>
      <div className="sm:pl-[34px]">{children}</div>
    </section>
  );
}

// Opción marcable con aspecto de tarjeta: se resalta cuando está elegida.
const choiceClasses =
  'flex min-h-11 cursor-pointer items-center gap-2.5 rounded-[10px] border border-adm-line-field bg-white px-3 py-2 text-sm text-adm-ink-700 transition-colors hover:bg-adm-surface-hover has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50 has-[:checked]:font-medium has-[:checked]:text-brand-900 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-adm-accent-ring';

// Ficha para una cuenta de especialista u odontóloga general que todavía no la
// tiene. Los servicios y el horario se eligen después, en su ficha, por sede.
function CreateProfessionalModal({ specialties, branches, onClose, onCreated, onAddExisting }: CreateProfessionalModalProps) {
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

  const selectedProfile = profiles.find((profile) => profile.id === profileId) ?? null;
  const role = selectedProfile?.role ?? null;
  const isSpecialist = role === 'especialista';
  const activeSpecialties = specialties.filter((specialty) => specialty.active);
  // Sin cuentas que puedan tener ficha no hay nada que llenar: solo se explica qué hacer.
  const hasNoAccounts = !isLoading && profiles.length === 0;

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
      maxWidth="max-w-[560px]"
      footer={
        hasNoAccounts ? (
          <Button type="button" variant="admin-outline" onClick={onClose}>
            Cerrar
          </Button>
        ) : (
          <>
            <Button type="button" variant="admin-outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              form="nuevo-profesional-form"
              variant="admin-solid"
              icon={<Check size={16} />}
              disabled={isSubmitting || isLoading}
            >
              {isSubmitting ? 'Guardando…' : 'Crear ficha'}
            </Button>
          </>
        )
      }
    >
      {isLoading ? (
        <div className="flex items-center justify-center gap-2.5 py-10 text-sm text-adm-ink-400">
          <Spinner size={22} />
          Buscando cuentas disponibles…
        </div>
      ) : hasNoAccounts ? (
        <div className="flex flex-col gap-4 py-3">
          <FormError message={error} />
          <div className="flex flex-col items-center gap-2 rounded-[12px] border border-dashed border-adm-line-field px-4 py-6 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-adm-status-pending-bg text-adm-status-pending-text">
              <UsersRound size={22} />
            </span>
            <p className="text-[15px] font-semibold text-adm-ink-700">No hay cuentas esperando su ficha</p>
            <p className="max-w-[380px] text-sm text-adm-ink-400">
              Todas las especialistas y odontólogas generales con cuenta ya tienen ficha. Elige qué quieres hacer:
            </p>
          </div>

          <div className="grid gap-2.5 sm:grid-cols-2">
            <div className="flex flex-col gap-2 rounded-[12px] border border-adm-line-card bg-white p-3.5 shadow-soft">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                <UserRoundPlus size={18} />
              </span>
              <p className="text-sm font-semibold text-adm-ink-700">Es nueva en la clínica</p>
              <p className="flex-1 text-[13px] text-adm-ink-400">Invítala desde Equipo: su ficha se crea junto con su cuenta.</p>
              <Button to="/admin/equipo" variant="admin-solid" size="sm" className="w-full">
                Ir a Equipo
              </Button>
            </div>
            <div className="flex flex-col gap-2 rounded-[12px] border border-adm-line-card bg-white p-3.5 shadow-soft">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                <MapPinPlus size={18} />
              </span>
              <p className="text-sm font-semibold text-adm-ink-700">Ya atiende en otra sede</p>
              <p className="flex-1 text-[13px] text-adm-ink-400">Búscala y súmala a tu sede sin crear otra ficha.</p>
              {onAddExisting && (
                <Button type="button" variant="admin-outline" size="sm" className="w-full" onClick={onAddExisting}>
                  Agregar a mi sede
                </Button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <form id="nuevo-profesional-form" onSubmit={handleSubmit} className="flex flex-col gap-5 py-3">
          <InfoCallout icon={IdCard} title="Crea la ficha de una profesional que ya tiene cuenta.">
            Sus servicios y su horario los eliges después, en su ficha.
          </InfoCallout>

          <FormError message={error} />

          <Step number={1} title="¿Para quién es la ficha?" hint="Solo aparecen las cuentas que todavía no tienen ficha.">
            <div className="flex flex-col gap-2.5">
              <Select
                label="Cuenta del profesional"
                hideLabel
                value={profileId}
                onChange={(event) => {
                  setProfileId(event.target.value);
                  setSpecialtyIds([]);
                }}
                options={[
                  { value: '', label: 'Selecciona una cuenta' },
                  ...profiles.map((profile) => ({
                    value: profile.id,
                    label: `${profile.fullName} · ${roleLabel(profile.role)} (${profile.email})`,
                  })),
                ]}
              />
              {selectedProfile && (
                <div className="flex items-center gap-3 rounded-[10px] border border-adm-line-card bg-adm-surface-hover p-2.5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#dceef0] text-sm font-semibold text-adm-accent-deep">
                    {initials(selectedProfile.fullName)}
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-semibold text-adm-ink-700">{selectedProfile.fullName}</span>
                    <span className="truncate text-[13px] text-adm-ink-400">{selectedProfile.email}</span>
                  </div>
                  <span className="shrink-0 rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-700">
                    {roleLabel(selectedProfile.role)}
                  </span>
                </div>
              )}
            </div>
          </Step>

          <Step
            number={2}
            title={isSpecialist ? 'Especialidad' : 'Especialidades'}
            hint={
              !profileId
                ? 'Primero elige la cuenta.'
                : isSpecialist
                  ? 'Una especialista tiene una sola especialidad.'
                  : 'Marca todas las que atiende.'
            }
          >
            {profileId && (
              <div className="grid max-h-[220px] gap-2 overflow-y-auto sm:grid-cols-2">
                {activeSpecialties.map((specialty) => (
                  <label key={specialty.id} className={choiceClasses}>
                    <input
                      type={isSpecialist ? 'radio' : 'checkbox'}
                      name="nuevo-especialidad"
                      className="h-4 w-4 shrink-0 accent-brand-600"
                      checked={specialtyIds.includes(specialty.id)}
                      onChange={() => setSpecialtyIds((current) => (isSpecialist ? [specialty.id] : toggle(current, specialty.id)))}
                    />
                    {specialty.name}
                  </label>
                ))}
              </div>
            )}
          </Step>

          <Step number={3} title="Sedes donde atiende" hint="Puedes cambiarlo después desde su ficha.">
            {branches.length === 0 ? (
              <p className="text-sm text-adm-ink-400">No administras ninguna sede activa.</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {branches.map((branch) => (
                  <label key={branch.id} className={choiceClasses}>
                    <input
                      type="checkbox"
                      className="h-4 w-4 shrink-0 accent-brand-600"
                      checked={branchIds.includes(branch.id)}
                      onChange={() => setBranchIds((current) => toggle(current, branch.id))}
                    />
                    <MapPin size={15} className="shrink-0 text-adm-ink-300" />
                    {branch.name}
                  </label>
                ))}
              </div>
            )}
          </Step>

          <Step number={4} title="Bio (opcional)" hint="Unas líneas sobre su experiencia o formación.">
            <textarea
              id="nuevo-bio"
              aria-label="Bio (opcional)"
              placeholder="Ej.: Odontóloga con 8 años de experiencia en endodoncia…"
              className="min-h-[84px] w-full rounded-[10px] border border-adm-line-field bg-adm-surface-input px-3.5 py-2.5 text-base text-adm-ink-700 outline-none placeholder:text-adm-ink-200 focus:border-brand-600 focus:bg-white focus:ring-2 focus:ring-adm-accent-ring sm:text-sm"
              value={bio}
              onChange={(event) => setBio(event.target.value)}
            />
          </Step>
        </form>
      )}
    </Modal>
  );
}

export default CreateProfessionalModal;
