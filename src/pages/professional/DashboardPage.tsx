import { CalendarCheck, Clock, Users } from 'lucide-react';
import StatCard from '../../components/common/StatCard';
import SectionTitle from '../../components/common/SectionTitle';
import UpcomingAppointments from '../../components/dashboard/UpcomingAppointments';
import { appointments, patients, timeSlots } from '../../data/mockData';

function DashboardPage() {
  const availableSlots = timeSlots.filter((slot) => slot.available).length;

  return (
    <div className="flex flex-col gap-8">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Mis citas" value={appointments.length} icon={CalendarCheck} />
        <StatCard label="Mis pacientes" value={patients.length} icon={Users} />
        <StatCard label="Horarios libres hoy" value={availableSlots} icon={Clock} />
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
