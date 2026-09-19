import type { Patient } from '../../types/Patient';
import { formatFullName } from '../../utils/format';

interface PatientCardProps {
  patient: Patient;
}

function PatientCard({ patient }: PatientCardProps) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[14px] border border-adm-line-card bg-white p-4 shadow-soft">
      <div className="flex flex-col gap-0.5">
        <p className="text-sm font-semibold text-adm-ink-700">
          {formatFullName(patient.firstName, patient.lastName)}
        </p>
        <p className="text-xs text-adm-ink-300 [font-variant-numeric:tabular-nums]">DNI {patient.dni}</p>
      </div>
      <div className="text-right text-xs text-adm-ink-400">
        <p className="[font-variant-numeric:tabular-nums]">{patient.phone}</p>
        <p>{patient.email}</p>
      </div>
    </div>
  );
}

export default PatientCard;
