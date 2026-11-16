import { useAuth } from '../../hooks/useAuth';
import DashboardPage from './DashboardPage';
import TodayAppointmentsPage from './TodayAppointmentsPage';

// La técnica empieza en "Citas de hoy"; la especialista y la odontóloga
// general, en su dashboard.
function HomePage() {
  const { user } = useAuth();
  return user?.role === 'tecnica' ? <TodayAppointmentsPage /> : <DashboardPage />;
}

export default HomePage;
