import type { Professional } from '../../types/Professional';
import { formatFullName } from '../../utils/format';

interface ProfessionalCardProps {
  professional: Professional;
  specialtyName?: string;
  meta?: string;
}

function ProfessionalCard({ professional, specialtyName, meta }: ProfessionalCardProps) {
  return (
    <div className="overflow-hidden rounded-2xl bg-white transition-all duration-200 hover:-translate-y-1">
      <div
        aria-hidden="true"
        className="aspect-square w-full"
        style={{ background: 'linear-gradient(150deg, #d2e9ec, #a8d5db)' }}
      />
      <div className="p-4">
        <p className="text-[15.5px] font-semibold text-brand-900">
          {formatFullName(professional.firstName, professional.lastName)}
        </p>
        {specialtyName && <p className="text-sm font-medium text-brand-700">{specialtyName}</p>}
        {meta && <p className="text-sm text-ink-tertiary">{meta}</p>}
      </div>
    </div>
  );
}

export default ProfessionalCard;
