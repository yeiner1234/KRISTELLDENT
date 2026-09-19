import { CalendarX2 } from 'lucide-react';
import SectionTitle from '../../components/common/SectionTitle';
import EmptyState from '../../components/common/EmptyState';
import Spinner from '../../components/common/Spinner';
import AppointmentCard from '../../components/appointments/AppointmentCard';
import { useAllAppointments } from '../../hooks/useAppointments';

function MyAppointmentsPage() {
  const { appointments, isLoading } = useAllAppointments();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionTitle title="Mis citas" align="left" />
        <span className="text-[13px] text-adm-ink-300">{appointments.length} citas</span>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Spinner size={28} />
        </div>
      ) : appointments.length === 0 ? (
        <EmptyState
          icon={CalendarX2}
          title="Sin citas registradas"
          description="Cuando tengas citas asignadas, aparecerán en esta lista."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {appointments.map((appointment) => (
            <AppointmentCard key={appointment.id} appointment={appointment} variant="admin" />
          ))}
        </div>
      )}
    </div>
  );
}

export default MyAppointmentsPage;
