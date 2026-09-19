import Select from '../common/Select';
import type { Professional } from '../../types/Professional';

interface ProfessionalSelectorProps {
  professionals: Professional[];
  value: string;
  onChange: (professionalId: string) => void;
  label?: string;
  hideLabel?: boolean;
}

function ProfessionalSelector({
  professionals,
  value,
  onChange,
  label = 'Profesional',
  hideLabel = false,
}: ProfessionalSelectorProps) {
  const options = [
    { value: '', label: 'Todos los profesionales' },
    ...professionals.map((professional) => ({
      value: professional.id,
      label: professional.fullName,
    })),
  ];

  return (
    <Select
      label={label}
      hideLabel={hideLabel}
      options={options}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

export default ProfessionalSelector;
