import type { Specialty } from '../../types/Specialty';

interface SpecialtySelectorProps {
  specialties: Specialty[];
  selectedId: string | null;
  onSelect: (specialtyId: string) => void;
}

function SpecialtySelector({ specialties, selectedId, onSelect }: SpecialtySelectorProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {specialties.map((specialty) => {
        const isSelected = specialty.id === selectedId;

        return (
          <button
            key={specialty.id}
            type="button"
            onClick={() => onSelect(specialty.id)}
            className={`rounded-2xl border-2 p-4 text-left transition-colors ${
              isSelected ? 'border-brand-600 bg-brand-50' : 'border-border hover:border-brand-600/40'
            }`}
          >
            <p className="font-semibold text-brand-900">{specialty.name}</p>
            <p className="mt-1 text-sm text-ink-tertiary">{specialty.description}</p>
          </button>
        );
      })}
    </div>
  );
}

export default SpecialtySelector;
