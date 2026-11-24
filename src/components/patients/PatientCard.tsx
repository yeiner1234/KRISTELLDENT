import type { Patient } from '../../types/Patient';
import { formatFullName } from '../../utils/format';

interface PatientCardProps {
  patient: Patient;
}

function PatientCard({ patient }: PatientCardProps) {
  return (
    <div className="flex flex-col items-start gap-2 rounded-[14px] sm:flex-row sm:items-center sm:justify-between sm:gap-4 border border-adm-line-card bg-white p-4 shadow-soft">
      <div className="flex flex-col gap-0.5">
        <p className="text-sm font-semibold text-adm-ink-700">
          {formatFullName(patient.firstName, patient.lastName)}
        </p>
        <p className="text-sm text-adm-ink-300 [font-variant-numeric:tabular-nums] sm:text-xs">DNI {patient.dni}</p>
      </div>
      <div className="max-w-full text-sm text-adm-ink-400 [overflow-wrap:anywhere] sm:max-w-none sm:text-right sm:text-xs sm:[overflow-wrap:normal]">
        <p className="[font-variant-numeric:tabular-nums]">{patient.phone}</p>
        <p>{patient.email}</p>
      </div>
    </div>
  );
}

export default PatientCard;
