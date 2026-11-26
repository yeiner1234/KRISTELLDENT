import { useMemo } from 'react';
import PatientsOverview from '../../components/patients/PatientsOverview';
import { useAllPatients } from '../../hooks/usePatients';
import { useAllAppointments } from '../../hooks/useAppointments';
import { useProfessionals } from '../../hooks/useProfessionals';
import { useServices } from '../../hooks/useServices';
import { usePanelBranch } from '../../hooks/usePanelBranch';
import { filterByPanelBranch } from '../../utils/panelBranch';
import { patientsOfAppointments } from '../../utils/appointmentViews';

// Pacientes con citas en la sede de la técnica, en la sede elegida arriba.
function BranchPatientsPage() {
  const { patients: visiblePatients, isLoading: isLoadingPatients, error: patientsError } = useAllPatients();
  const { appointments, isLoading: isLoadingAppointments, error: appointmentsError } = useAllAppointments();
  // La técnica no puede leer profiles: los nombres salen de get_public_professionals.
  const { professionals, error: professionalsError } = useProfessionals();
  const { services, error: servicesError } = useServices();
  const { selectedBranchId, branchName } = usePanelBranch();

  const branchAppointments = useMemo(
    () => filterByPanelBranch(appointments, selectedBranchId),
    [appointments, selectedBranchId],
  );
  const patients = useMemo(
    () => patientsOfAppointments(visiblePatients, branchAppointments),
    [visiblePatients, branchAppointments],
  );

  return (
    <PatientsOverview
      title="Pacientes"
      patients={patients}
      appointments={branchAppointments}
      professionals={professionals}
      services={services}
      branchName={branchName}
      isLoading={isLoadingPatients || isLoadingAppointments}
      error={patientsError ?? appointmentsError ?? professionalsError ?? servicesError}
      emptyDescription="Los pacientes con citas en tu sede aparecerán aquí."
    />
  );
}

export default BranchPatientsPage;
