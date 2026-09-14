import { CalendarCheck, ClipboardList, Stethoscope, Users } from 'lucide-react';
import StatCard from '../../components/common/StatCard';
import SectionTitle from '../../components/common/SectionTitle';
import UpcomingAppointments from '../../components/dashboard/UpcomingAppointments';
import { appointments, patients, professionals, specialties } from '../../data/mockData';

function DashboardPage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Citas registradas" value={appointments.length} icon={CalendarCheck} />
        <StatCard label="Pacientes" value={patients.length} icon={Users} />
        <StatCard label="Profesionales activos" value={professionals.length} icon={Stethoscope} />
        <StatCard label="Especialidades" value={specialties.length} icon={ClipboardList} />
      </div>

      <div>
        <SectionTitle title="Próximas citas" align="left" />
        <div className="mt-4">
          <UpcomingAppointments />
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
