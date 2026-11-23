import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import SearchInput from '../common/SearchInput';
import Button from '../common/Button';
import { createSpecialty } from '../../services/specialtyService';
import { isSameSpecialtyName, nameKey, similarSpecialties } from '../../utils/specialtyMatch';
import type { Specialty } from '../../types/Specialty';

interface SpecialtyPickerProps {
  // Lista compartida completa: solo se eligen las activas.
  specialties: Specialty[];
  value: string;
  onChange: (specialtyId: string) => void;
  // Se agregó una especialidad nueva a la lista: recargarla.
  onCreated: (specialty: Specialty) => void;
}

// Buscador sobre la lista compartida de especialidades. Si lo escrito no
// existe, ofrece agregarlo, avisando antes de las parecidas ("¿Quisiste decir
// Ortodoncia?") para no duplicar.
function SpecialtyPicker({ specialties, value, onChange, onCreated }: SpecialtyPickerProps) {
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const active = useMemo(() => specialties.filter((specialty) => specialty.active), [specialties]);
  const term = nameKey(query);
  const visible = term ? active.filter((specialty) => nameKey(specialty.name).includes(term)) : active;
  const exact = specialties.find((specialty) => isSameSpecialtyName(specialty.name, query));
  const similar = term && !exact ? similarSpecialties(query, active) : [];
  const selected = specialties.find((specialty) => specialty.id === value);

  const handleCreate = async () => {
    setError(null);
    setIsCreating(true);
    try {
      const created = await createSpecialty({ name: query, description: null });
      onCreated(created);
      onChange(created.id);
      setQuery('');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo agregar la especialidad.';
      setError(message);
      // Otra sede la agregó entretanto: se elige la existente.
      const existing = specialties.find((specialty) => isSameSpecialtyName(specialty.name, query));
      if (existing?.active) onChange(existing.id);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-adm-ink-700">Especialidad</span>
      {selected && (
        <p className="text-[13px] text-adm-ink-400">
          Elegida: <span className="font-semibold text-adm-ink-700">{selected.name}</span>
        </p>
      )}
      <SearchInput
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setError(null);
        }}
        placeholder="Buscar o agregar especialidad..."
        aria-label="Buscar especialidad"
      />

      {visible.length > 0 && (
        <div
          role="radiogroup"
          aria-label="Especialidades"
          className="flex max-h-[160px] flex-col gap-1.5 overflow-y-auto rounded-[10px] border border-adm-line-field p-3"
        >
          {visible.map((specialty) => (
            <label key={specialty.id} className="flex items-center gap-2 text-sm text-adm-ink-700">
              <input
                type="radio"
                name="specialty-picker"
                className="h-[15px] w-[15px] accent-brand-600"
                checked={specialty.id === value}
                onChange={() => onChange(specialty.id)}
              />
              {specialty.name}
            </label>
          ))}
        </div>
      )}

      {exact && !exact.active && (
        <p className="text-[13px] text-adm-ink-400">
          "{exact.name}" existe pero está desactivada. Pide a la administración general que la active.
        </p>
      )}

      {term.length >= 3 && !exact && (
        <div className="flex flex-col gap-2 rounded-[10px] border border-dashed border-adm-line-field p-3">
          {similar.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 text-[13px] text-adm-ink-700">
              <span>¿Quisiste decir</span>
              {similar.map((specialty) => (
                <button
                  key={specialty.id}
                  type="button"
                  onClick={() => {
                    onChange(specialty.id);
                    setQuery('');
                  }}
                  className="rounded-full border border-adm-line-control px-2.5 py-0.5 font-medium text-adm-accent-deep hover:bg-adm-surface-hover"
                >
                  {specialty.name}
                </button>
              ))}
              <span>?</span>
            </div>
          )}
          <Button
            type="button"
            variant="admin-outline"
            size="xs"
            icon={<Plus size={13} />}
            disabled={isCreating}
            onClick={handleCreate}
          >
            {isCreating ? 'Agregando…' : `Agregar especialidad "${query.trim()}"`}
          </Button>
        </div>
      )}

      {error && <p className="text-[13px] font-medium text-adm-danger-text">{error}</p>}
    </div>
  );
}

export default SpecialtyPicker;
