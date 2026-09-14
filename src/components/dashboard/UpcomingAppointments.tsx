import { CalendarX2 } from 'lucide-react';
import { appointments, professionals } from '../../data/mockData';
import { formatFullName } from '../../utils/format';
import AppointmentCard from '../appointments/AppointmentCard';
import EmptyState from '../common/EmptyState';

function UpcomingAppointments() {
  if (appointments.length === 0) {
    return (
      <EmptyState
        title="Sin citas próximas"
        description="Todavía no hay citas registradas en el sistema."
        icon={CalendarX2}
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {appointments.map((appointment) => {
        const professional = professionals.find((item) => item.id === appointment.professionalId);

        return (
          <AppointmentCard
            key={appointment.id}
            appointment={appointment}
            professionalName={professional ? formatFullName(professional.firstName, professional.lastName) : undefined}
          />
        );
      })}
    </div>
  );
}

export default UpcomingAppointments;
