import { Outlet } from 'react-router-dom';
import AdminSidebar from '../components/dashboard/AdminSidebar';
import DashboardHeader from '../components/dashboard/DashboardHeader';

function AdminLayout() {
  return (
    <div className="flex min-h-screen bg-adm-surface-app">
      <AdminSidebar />
      <div className="flex flex-1 flex-col">
        <DashboardHeader heading="Panel administrativo" variant="admin" />
        <main className="flex-1 p-[26px]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AdminLayout;
