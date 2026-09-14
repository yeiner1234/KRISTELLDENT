import { useState } from 'react';
import { CalendarX2 } from 'lucide-react';
import SectionTitle from '../../components/common/SectionTitle';
import CalendarPicker from '../../components/common/CalendarPicker';
import EmptyState from '../../components/common/EmptyState';
import AppointmentCard from '../../components/appointments/AppointmentCard';
import { appointments, professionals } from '../../data/mockData';
import { formatFullName } from '../../utils/format';
import { getTodayIsoDate } from '../../utils/date';

function AgendaPage() {
  const [selectedDate, setSelectedDate] = useState(getTodayIsoDate());

  const dayAppointments = appointments.filter((appointment) => appointment.date === selectedDate);

  return (
    <div className="flex flex-col gap-6">
      <SectionTitle title="Agenda general" align="left" />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,320px)_1fr]">
        <CalendarPicker selectedDate={selectedDate} onSelect={setSelectedDate} />

        <div className="flex flex-col gap-3">
          {dayAppointments.length === 0 ? (
            <EmptyState icon={CalendarX2} title="Sin citas" description="No hay citas registradas para este día." />
          ) : (
            dayAppointments.map((appointment) => {
              const professional = professionals.find((item) => item.id === appointment.professionalId);
              return (
                <AppointmentCard
                  key={appointment.id}
                  appointment={appointment}
                  professionalName={
                    professional ? formatFullName(professional.firstName, professional.lastName) : undefined
                  }
                />
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export default AgendaPage;
