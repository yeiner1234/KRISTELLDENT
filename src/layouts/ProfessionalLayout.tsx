import { Outlet, useLocation } from 'react-router-dom';
import ProfessionalSidebar from '../components/dashboard/ProfessionalSidebar';
import DashboardHeader from '../components/dashboard/DashboardHeader';
import PanelBranchSelector from '../components/dashboard/PanelBranchSelector';
import PanelBranchProvider from '../context/PanelBranchProvider';

function ProfessionalLayout() {
  const { pathname } = useLocation();
  // La agenda imprimible tiene su propio selector "Sede", atado a este.
  const showBranchSelector = !pathname.startsWith('/profesional/reportes');

  return (
    <PanelBranchProvider>
      <div className="flex min-h-screen bg-adm-surface-app">
        <ProfessionalSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <DashboardHeader heading="Panel profesional" variant="professional" />
          <main className="flex flex-1 flex-col gap-6 p-[26px]">
            {showBranchSelector && <PanelBranchSelector />}
            <Outlet />
          </main>
        </div>
      </div>
    </PanelBranchProvider>
  );
}

export default ProfessionalLayout;
