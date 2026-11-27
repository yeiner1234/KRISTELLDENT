import { useState, type FormEvent } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Input from '../common/Input';
import Select from '../common/Select';
import FormError from '../common/FormError';
import SpecialtyPicker from '../specialties/SpecialtyPicker';
import {
  createService,
  MAX_SERVICE_DURATION,
  MAX_SERVICE_SESSIONS,
  updateService,
  validateServiceInput,
} from '../../services/serviceService';
import type { Specialty } from '../../types/Specialty';

export interface EditableService {
  id: string;
  name: string;
  specialtyId: string;
  duration: number;
  price: number;
  sessions?: number;
}

interface ServiceFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  // null = servicio nuevo.
  editing: EditableService | null;
  // Sedes donde se puede crear. Con una sola, no se muestra el selector.
  branchOptions: { id: string; name: string }[];
  defaultBranchId: string;
  specialties: Specialty[];
  onSpecialtyCreated: () => void;
}

// Se monta de nuevo cada vez que se abre (key en el padre): el formulario
// arranca con los datos del servicio o vacío.
function ServiceFormModal({
  isOpen,
  onClose,
  onSaved,
  editing,
  branchOptions,
  defaultBranchId,
  specialties,
  onSpecialtyCreated,
}: ServiceFormModalProps) {
  const [branchId, setBranchId] = useState(defaultBranchId);
  const [name, setName] = useState(editing?.name ?? '');
  const [specialtyId, setSpecialtyId] = useState(editing?.specialtyId ?? '');
  const [duration, setDuration] = useState(String(editing?.duration ?? 30));
  const [price, setPrice] = useState(String(editing?.price ?? ''));
  const [sessions, setSessions] = useState(String(editing?.sessions ?? 1));
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const input = {
      name,
      specialtyId,
      duration: Number(duration),
      price: price === '' ? Number.NaN : Number(price),
      sessions: Number(sessions),
    };
    const problem = validateServiceInput(input) ?? (!editing && !branchId ? 'Elige una sede.' : null);
    if (problem) {
      setError(problem);
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      if (editing) {
        await updateService(editing.id, input);
      } else {
        await createService({ ...input, branchId });
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el servicio.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const branchName = branchOptions.find((branch) => branch.id === branchId)?.name;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editing ? 'Editar servicio' : 'Nuevo servicio'}
      maxWidth="max-w-[520px]"
      footer={
        <>
          <Button type="button" variant="admin-outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="servicio-form" variant="admin-solid" disabled={isSubmitting}>
            {isSubmitting ? 'Guardando…' : 'Guardar'}
          </Button>
        </>
      }
    >
      <form id="servicio-form" noValidate onSubmit={handleSubmit} className="flex flex-col gap-4 py-2">
        <FormError message={error} />

        {!editing && branchOptions.length > 1 ? (
          <Select
            label="Sede"
            value={branchId}
            onChange={(event) => setBranchId(event.target.value)}
            options={[{ value: '', label: 'Elige una sede' }, ...branchOptions.map((b) => ({ value: b.id, label: b.name }))]}
          />
        ) : (
          branchName && (
            <p className="text-sm text-adm-ink-400">
              Sede: <span className="font-semibold text-adm-ink-700">{branchName}</span>
            </p>
          )
        )}

        <Input
          label="Nombre del servicio"
          name="name"
          variant="admin"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
        />

        <SpecialtyPicker
          specialties={specialties}
          value={specialtyId}
          onChange={setSpecialtyId}
          onCreated={onSpecialtyCreated}
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label="Precio (S/)"
            name="price"
            type="number"
            min={0}
            step="0.01"
            variant="admin"
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            required
          />
          <Input
            label="Duración (minutos)"
            name="duration"
            type="number"
            min={1}
            max={MAX_SERVICE_DURATION}
            variant="admin"
            value={duration}
            onChange={(event) => setDuration(event.target.value)}
            required
          />
          <Input
            label="Sesiones del tratamiento"
            name="sessions"
            type="number"
            min={1}
            max={MAX_SERVICE_SESSIONS}
            variant="admin"
            value={sessions}
            onChange={(event) => setSessions(event.target.value)}
            required
          />
        </div>
        <p className="text-xs text-adm-ink-400">
          El precio y la duración son los de esta sede: otras sedes pueden tener un servicio con el mismo nombre y
          otros valores. Con más de una sesión (endodoncia, ortodoncia…), la historia del paciente lo muestra como
          tratamiento.
        </p>
      </form>
    </Modal>
  );
}

export default ServiceFormModal;
