import { Outlet } from 'react-router-dom';
import AdminSidebar from '../components/dashboard/AdminSidebar';
import DashboardHeader from '../components/dashboard/DashboardHeader';

function AdminLayout() {
  return (
    <div className="flex min-h-screen bg-surface-alt">
      <AdminSidebar />
      <div className="flex flex-1 flex-col">
        <DashboardHeader heading="Panel administrativo" />
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AdminLayout;
