import { useMemo, useState } from 'react';
import { Users } from 'lucide-react';
import SectionTitle from '../../components/common/SectionTitle';
import SearchInput from '../../components/common/SearchInput';
import EmptyState from '../../components/common/EmptyState';
import Spinner from '../../components/common/Spinner';
import PatientCard from '../../components/patients/PatientCard';
import { useAllPatients } from '../../hooks/usePatients';
import { useAllAppointments } from '../../hooks/useAppointments';
import { usePanelBranch } from '../../hooks/usePanelBranch';
import { filterByPanelBranch } from '../../utils/panelBranch';
import { patientsOfAppointments } from '../../utils/appointmentViews';

// Pacientes con citas en la sede de la técnica, en la sede elegida arriba.
function BranchPatientsPage() {
  const { patients: visiblePatients, isLoading: isLoadingPatients, error: patientsError } = useAllPatients();
  const { appointments, isLoading: isLoadingAppointments, error: appointmentsError } = useAllAppointments();
  const { selectedBranchId } = usePanelBranch();
  const patients = useMemo(
    () => patientsOfAppointments(visiblePatients, filterByPanelBranch(appointments, selectedBranchId)),
    [visiblePatients, appointments, selectedBranchId],
  );
  const isLoading = isLoadingPatients || isLoadingAppointments;
  const error = patientsError ?? appointmentsError;
  const [query, setQuery] = useState('');

  const filteredPatients = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return patients;

    return patients.filter((patient) =>
      `${patient.firstName} ${patient.lastName} ${patient.dni}`.toLowerCase().includes(term),
    );
  }, [query, patients]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionTitle title="Pacientes" align="left" />
        <span className="text-[13px] text-adm-ink-300">
          {filteredPatients.length} {filteredPatients.length === 1 ? 'paciente' : 'pacientes'}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2.5 rounded-[14px] border border-adm-line-card bg-white p-4">
        <SearchInput
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar por nombre o DNI..."
          aria-label="Buscar pacientes"
          wrapperClassName="min-w-[180px] flex-1"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Spinner size={28} />
        </div>
      ) : error ? (
        <EmptyState icon={Users} title="No se pudieron cargar los pacientes" description={error} />
      ) : filteredPatients.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Sin pacientes para mostrar"
          description="Los pacientes con citas en tu sede aparecerán aquí."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filteredPatients.map((patient) => (
            <PatientCard key={patient.id} patient={patient} />
          ))}
        </div>
      )}
    </div>
  );
}

export default BranchPatientsPage;
