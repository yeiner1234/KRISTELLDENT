import { CalendarX2 } from 'lucide-react';
import SectionTitle from '../../components/common/SectionTitle';
import EmptyState from '../../components/common/EmptyState';
import AppointmentCard from '../../components/appointments/AppointmentCard';
import { appointments } from '../../data/mockData';

function MyAppointmentsPage() {
  return (
    <div className="flex flex-col gap-6">
      <SectionTitle title="Mis citas" align="left" />

      {appointments.length === 0 ? (
        <EmptyState
          icon={CalendarX2}
          title="Sin citas registradas"
          description="Cuando tengas citas asignadas, aparecerán en esta lista."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {appointments.map((appointment) => (
            <AppointmentCard key={appointment.id} appointment={appointment} />
          ))}
        </div>
      )}
    </div>
  );
}

export default MyAppointmentsPage;
