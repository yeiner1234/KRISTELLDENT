import { useMemo, useState } from 'react';
import { Plus, Users } from 'lucide-react';
import SectionTitle from '../../components/common/SectionTitle';
import SearchInput from '../../components/common/SearchInput';
import Button from '../../components/common/Button';
import EmptyState from '../../components/common/EmptyState';
import Spinner from '../../components/common/Spinner';
import PatientCard from '../../components/patients/PatientCard';
import { useAllPatients } from '../../hooks/usePatients';

function PatientsPage() {
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
      <SectionTitle title="Pacientes" align="left" />

      <div className="flex flex-wrap items-center gap-2.5 rounded-[14px] border border-adm-line-card bg-white p-4">
        <SearchInput
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar por nombre o DNI..."
          wrapperClassName="min-w-[180px] flex-1"
        />
        <Button type="button" variant="admin-solid" size="sm" icon={<Plus size={16} />}>
          Nuevo paciente
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Spinner size={28} />
        </div>
      ) : filteredPatients.length === 0 ? (
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
