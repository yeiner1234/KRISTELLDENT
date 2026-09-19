import { useMemo, useState } from 'react';
import { Users } from 'lucide-react';
import SectionTitle from '../../components/common/SectionTitle';
import SearchInput from '../../components/common/SearchInput';
import EmptyState from '../../components/common/EmptyState';
import Spinner from '../../components/common/Spinner';
import PatientCard from '../../components/patients/PatientCard';
import { useAllPatients } from '../../hooks/usePatients';

function MyPatientsPage() {
  const { patients, isLoading } = useAllPatients();
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
        <SectionTitle title="Mis pacientes" align="left" />
        <span className="text-[13px] text-adm-ink-300">{filteredPatients.length} pacientes</span>
      </div>

      <SearchInput
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Buscar por nombre o DNI..."
        wrapperClassName="max-w-sm"
      />

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Spinner size={28} />
        </div>
      ) : filteredPatients.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Sin pacientes asignados"
          description="Los pacientes que reserven contigo aparecerán aquí."
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

export default MyPatientsPage;
