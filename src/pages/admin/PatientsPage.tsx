import { useMemo, useState } from 'react';
import { Users } from 'lucide-react';
import SectionTitle from '../../components/common/SectionTitle';
import SearchInput from '../../components/common/SearchInput';
import EmptyState from '../../components/common/EmptyState';
import PatientCard from '../../components/patients/PatientCard';
import { patients } from '../../data/mockData';

function PatientsPage() {
  const [query, setQuery] = useState('');

  const filteredPatients = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return patients;

    return patients.filter((patient) =>
      `${patient.firstName} ${patient.lastName} ${patient.dni}`.toLowerCase().includes(term),
    );
  }, [query]);

  return (
    <div className="flex flex-col gap-6">
      <SectionTitle title="Pacientes" align="left" />

      <SearchInput
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Buscar por nombre o DNI..."
        wrapperClassName="max-w-sm"
      />

      {filteredPatients.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Sin pacientes registrados"
          description="Los pacientes aparecerán aquí a medida que reserven citas."
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

export default PatientsPage;
