import { Outlet } from 'react-router-dom';
import ProfessionalSidebar from '../components/dashboard/ProfessionalSidebar';
import DashboardHeader from '../components/dashboard/DashboardHeader';

function ProfessionalLayout() {
  return (
    <div className="flex min-h-screen bg-surface-alt">
      <ProfessionalSidebar />
      <div className="flex flex-1 flex-col">
        <DashboardHeader heading="Panel profesional" />
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default ProfessionalLayout;
