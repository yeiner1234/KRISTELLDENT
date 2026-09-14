import Select from '../common/Select';
import type { Professional } from '../../types/Professional';
import { formatFullName } from '../../utils/format';

interface ProfessionalSelectorProps {
  professionals: Professional[];
  value: string;
  onChange: (professionalId: string) => void;
  label?: string;
}

function ProfessionalSelector({ professionals, value, onChange, label = 'Profesional' }: ProfessionalSelectorProps) {
  const options = [
    { value: '', label: 'Todos los profesionales' },
    ...professionals.map((professional) => ({
      value: professional.id,
      label: formatFullName(professional.firstName, professional.lastName),
    })),
  ];

  return (
    <Select label={label} options={options} value={value} onChange={(event) => onChange(event.target.value)} />
  );
}

export default ProfessionalSelector;
