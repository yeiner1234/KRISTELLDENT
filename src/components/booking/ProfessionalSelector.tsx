import type { Professional } from '../../types/Professional';
import { formatFullName } from '../../utils/format';

interface ProfessionalSelectorProps {
  professionals: Professional[];
  selectedId: string | null;
  onSelect: (professionalId: string) => void;
}

function ProfessionalSelector({ professionals, selectedId, onSelect }: ProfessionalSelectorProps) {
  if (professionals.length === 0) {
    return <p className="text-sm text-ink-tertiary">No hay profesionales disponibles para esta especialidad.</p>;
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {professionals.map((professional) => {
        const isSelected = professional.id === selectedId;
        const fullName = formatFullName(professional.firstName, professional.lastName);

        return (
          <button
            key={professional.id}
            type="button"
            onClick={() => onSelect(professional.id)}
            className={`rounded-2xl border-2 p-4 text-left transition-colors ${
              isSelected ? 'border-brand-600 bg-brand-50' : 'border-border hover:border-brand-600/40'
            }`}
          >
            <p className="font-semibold text-brand-900">{fullName}</p>
          </button>
        );
      })}
    </div>
  );
}

export default ProfessionalSelector;
