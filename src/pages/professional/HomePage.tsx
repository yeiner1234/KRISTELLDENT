import { useAuth } from '../../hooks/useAuth';
import DashboardPage from './DashboardPage';
import BranchAppointmentsPage from './BranchAppointmentsPage';

// La técnica empieza en "Citas" de su sede (abre en el día de hoy); la
// especialista y la odontóloga general, en su dashboard.
function HomePage() {
  const { user } = useAuth();
  return user?.role === 'tecnica' ? <BranchAppointmentsPage /> : <DashboardPage />;
}

export default HomePage;
