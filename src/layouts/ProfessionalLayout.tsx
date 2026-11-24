import { Outlet, useLocation } from 'react-router-dom';
import ProfessionalSidebar from '../components/dashboard/ProfessionalSidebar';
import PanelShell from '../components/dashboard/PanelShell';
import PanelBranchSelector from '../components/dashboard/PanelBranchSelector';
import PanelBranchProvider from '../context/PanelBranchProvider';

function ProfessionalLayout() {
  const { pathname } = useLocation();
  // La agenda imprimible tiene su propio selector "Sede", atado a este.
  const showBranchSelector = !pathname.startsWith('/profesional/reportes');

  return (
    <PanelBranchProvider>
      <PanelShell
        sidebar={<ProfessionalSidebar />}
        heading="Panel profesional"
        variant="professional"
        mainClassName="flex flex-1 flex-col gap-4 p-4 sm:gap-6 sm:p-[26px]"
      >
        {showBranchSelector && <PanelBranchSelector />}
        <Outlet />
      </PanelShell>
    </PanelBranchProvider>
  );
}

export default ProfessionalLayout;
