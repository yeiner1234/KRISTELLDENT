import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { CalendarX2 } from 'lucide-react';
import SectionTitle from '../../components/common/SectionTitle';
import Button from '../../components/common/Button';
import Spinner from '../../components/common/Spinner';
import EmptyState from '../../components/common/EmptyState';
import AppointmentCard from '../../components/appointments/AppointmentCard';
import { useAppointments } from '../../hooks/useAppointments';
import { useProfessionals } from '../../hooks/useProfessionals';
import { formatFullName } from '../../utils/format';

interface MyAppointmentsLocationState {
  dni?: string;
}

function MyAppointmentsPage() {
  const location = useLocation();
  const state = (location.state ?? {}) as MyAppointmentsLocationState;
  const { appointments, isLoading, fetchByDni } = useAppointments();
  const { professionals } = useProfessionals();

  useEffect(() => {
    if (state.dni) {
      fetchByDni(state.dni);
    }
  }, [state.dni, fetchByDni]);

  if (!state.dni) {
    return (
      <section className="mx-auto max-w-lg px-4 py-16 text-center sm:px-6">
        <SectionTitle title="No hay una consulta activa" subtitle="Verifica tu identidad para ver tus citas." />
        <div className="mt-6">
          <Button to="/consultar-citas">Consultar mis citas</Button>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <SectionTitle eyebrow="Mis citas" title="Tus citas registradas" align="left" />

      <div className="mt-8">
        {isLoading ? (
          <Spinner size={28} />
        ) : appointments.length === 0 ? (
          <EmptyState
            icon={CalendarX2}
            title="Aún no tienes citas registradas"
            description="Cuando reserves una cita, aparecerá en esta lista."
          />
        ) : (
          <div className="flex flex-col gap-4">
            {appointments.map((appointment) => {
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
            })}
          </div>
        )}
      </div>
    </section>
  );
}

export default MyAppointmentsPage;
