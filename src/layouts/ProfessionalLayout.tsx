import { Outlet } from 'react-router-dom';
import ProfessionalSidebar from '../components/dashboard/ProfessionalSidebar';
import DashboardHeader from '../components/dashboard/DashboardHeader';

function ProfessionalLayout() {
  return (
    <div className="flex min-h-screen bg-adm-surface-app">
      <ProfessionalSidebar />
      <div className="flex flex-1 flex-col">
        <DashboardHeader heading="Panel profesional" variant="professional" />
        <main className="flex-1 p-[26px]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default ProfessionalLayout;
