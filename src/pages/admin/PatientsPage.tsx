import { useCallback } from 'react';
import { Plus } from 'lucide-react';
import Button from '../../components/common/Button';
import PatientsOverview from '../../components/patients/PatientsOverview';
import { useAllPatients } from '../../hooks/usePatients';
import { useAllAppointments } from '../../hooks/useAppointments';
import { useAdminProfessionals } from '../../hooks/useAdminProfessionals';
import { useAdminServices } from '../../hooks/useAdminServices';
import { useAdminBranches } from '../../hooks/useAdminBranches';

// Todos los pacientes que la RLS deja ver (admin_sede: los de sus sedes),
// también los que aún no tienen citas.
function PatientsPage() {
  const { patients, isLoading: isLoadingPatients, error: patientsError } = useAllPatients();
  const { appointments, isLoading: isLoadingAppointments, error: appointmentsError } = useAllAppointments();
  const { professionals, error: professionalsError } = useAdminProfessionals();
  const { services, error: servicesError } = useAdminServices();
  const { branches, error: branchesError } = useAdminBranches();
  const branchName = useCallback(
    (branchId: string) => branches.find((branch) => branch.id === branchId)?.name ?? '—',
    [branches],
  );

  return (
    <PatientsOverview
      title="Pacientes"
      patients={patients}
      appointments={appointments}
      professionals={professionals}
      services={services}
      branchName={branchName}
      isLoading={isLoadingPatients || isLoadingAppointments}
      error={patientsError ?? appointmentsError ?? professionalsError ?? servicesError ?? branchesError}
      emptyDescription="Los pacientes aparecerán aquí a medida que reserven citas."
      headerAction={
        <Button type="button" variant="admin-solid" size="sm" icon={<Plus size={16} />}>
          Nuevo paciente
        </Button>
      }
    />
  );
}

export default PatientsPage;
