import { useMemo } from 'react';
import PatientsOverview from '../../components/patients/PatientsOverview';
import { useAllPatients } from '../../hooks/usePatients';
import { useAuth } from '../../hooks/useAuth';
import { useMyAppointments } from '../../hooks/useAppointments';
import { useProfessionals } from '../../hooks/useProfessionals';
import { useServices } from '../../hooks/useServices';
import { patientsOfAppointments } from '../../utils/appointmentViews';
import { usePanelBranch } from '../../hooks/usePanelBranch';
import { filterByPanelBranch } from '../../utils/panelBranch';

function MyPatientsPage() {
  const { user } = useAuth();
  const { patients: visiblePatients, isLoading: isLoadingPatients, error: patientsError } = useAllPatients();
  const { appointments, isLoading: isLoadingAppointments, error: appointmentsError } = useMyAppointments(user?.id);
  const { professionals, error: professionalsError } = useProfessionals();
  const { services, error: servicesError } = useServices();
  const { selectedBranchId, branchName } = usePanelBranch();
  // Solo los pacientes de sus propias citas (criterio 2 de HU12), en la sede
  // elegida arriba.
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
      title="Mis pacientes"
      patients={patients}
      appointments={branchAppointments}
      professionals={professionals}
      services={services}
      branchName={branchName}
      isLoading={isLoadingPatients || isLoadingAppointments}
      error={patientsError ?? appointmentsError ?? professionalsError ?? servicesError}
      emptyDescription="Los pacientes que reserven contigo aparecerán aquí."
    />
  );
}

export default MyPatientsPage;
