import { useState } from 'react';
import { CalendarX2 } from 'lucide-react';
import SectionTitle from '../../components/common/SectionTitle';
import CalendarPicker from '../../components/common/CalendarPicker';
import EmptyState from '../../components/common/EmptyState';
import AppointmentCard from '../../components/appointments/AppointmentCard';
import { appointments } from '../../data/mockData';
import { getTodayIsoDate } from '../../utils/date';

function MyAgendaPage() {
  const [selectedDate, setSelectedDate] = useState(getTodayIsoDate());

  const dayAppointments = appointments.filter((appointment) => appointment.date === selectedDate);

  return (
    <div className="flex flex-col gap-6">
      <SectionTitle title="Mi agenda" align="left" />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,320px)_1fr]">
        <CalendarPicker selectedDate={selectedDate} onSelect={setSelectedDate} />

        <div className="flex flex-col gap-3">
          {dayAppointments.length === 0 ? (
            <EmptyState icon={CalendarX2} title="Sin citas" description="No tienes citas registradas para este día." />
          ) : (
            dayAppointments.map((appointment) => (
              <AppointmentCard key={appointment.id} appointment={appointment} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default MyAgendaPage;
