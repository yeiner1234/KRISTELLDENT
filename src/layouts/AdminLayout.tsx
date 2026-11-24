import { Outlet } from 'react-router-dom';
import AdminSidebar from '../components/dashboard/AdminSidebar';
import PanelShell from '../components/dashboard/PanelShell';

function AdminLayout() {
  return (
    <PanelShell
      sidebar={<AdminSidebar />}
      heading="Panel administrativo"
      variant="admin"
      mainClassName="flex-1 p-4 sm:p-[26px]"
    >
      <Outlet />
    </PanelShell>
  );
}

export default AdminLayout;
