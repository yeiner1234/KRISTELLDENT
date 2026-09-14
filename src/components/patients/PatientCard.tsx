import type { Patient } from '../../types/Patient';
import { formatFullName } from '../../utils/format';

interface PatientCardProps {
  patient: Patient;
}

function PatientCard({ patient }: PatientCardProps) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-border bg-white p-4">
      <div>
        <p className="text-sm font-semibold text-brand-900">
          {formatFullName(patient.firstName, patient.lastName)}
        </p>
        <p className="text-xs text-ink-tertiary">DNI {patient.dni}</p>
      </div>
      <div className="text-right text-xs text-ink-secondary">
        <p>{patient.phone}</p>
        <p>{patient.email}</p>
      </div>
    </div>
  );
}

export default PatientCard;
