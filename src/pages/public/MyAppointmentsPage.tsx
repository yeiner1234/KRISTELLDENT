import { useMemo, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { CalendarX2, CheckCircle2, RefreshCw } from 'lucide-react';
import SectionTitle from '../../components/common/SectionTitle';
import Button from '../../components/common/Button';
import Spinner from '../../components/common/Spinner';
import EmptyState from '../../components/common/EmptyState';
import Modal from '../../components/common/Modal';
import FormError from '../../components/common/FormError';
import PatientAppointmentCard from '../../components/appointments/PatientAppointmentCard';
import PatientRescheduleModal from '../../components/appointments/PatientRescheduleModal';
import { usePatientAppointments } from '../../hooks/usePatientAppointments';
import { cancelPatientAppointment } from '../../services/appointmentService';
import { canPatientModify } from '../../utils/patientAppointments';
import { formatDateLong, getTodayIsoDate } from '../../utils/date';
import type { PatientAppointment } from '../../types/Appointment';

interface MyAppointmentsLocationState {
  dni?: string;
  code?: string;
}

// Próximas primero (la más cercana arriba) y luego las pasadas (la más reciente arriba).
function sortForPatient(appointments: PatientAppointment[], today: string): PatientAppointment[] {
  const key = (item: PatientAppointment) => `${item.date} ${item.startTime}`;
  const upcoming = appointments.filter((item) => item.date >= today).sort((a, b) => key(a).localeCompare(key(b)));
  const past = appointments.filter((item) => item.date < today).sort((a, b) => key(b).localeCompare(key(a)));
  return [...upcoming, ...past];
}

function MyAppointmentsPage() {
  const location = useLocation();
  // El DNI y el código viajan en el state, nunca en la URL: al recargar la
  // página se pierden y se vuelve a pedirlos.
  const state = (location.state ?? {}) as MyAppointmentsLocationState;
  const { patientName, appointments, isLoading, error, refetch } = usePatientAppointments(state.dni, state.code);

  const [toCancel, setToCancel] = useState<PatientAppointment | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [toReschedule, setToReschedule] = useState<PatientAppointment | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const today = getTodayIsoDate();
  const sorted = useMemo(() => sortForPatient(appointments, today), [appointments, today]);

  if (!state.dni || !state.code) {
    return <Navigate to="/consultar-citas" replace />;
  }
  const { dni, code } = state;

  const closeCancel = () => {
    if (isCancelling) return;
    setToCancel(null);
    setCancelError(null);
  };

  const handleCancel = async () => {
    if (!toCancel || isCancelling) return;
    setIsCancelling(true);
    setCancelError(null);
    try {
      await cancelPatientAppointment(dni, code, toCancel.id);
      setNotice(`La cita ${toCancel.code} fue cancelada.`);
      setToCancel(null);
      refetch();
    } catch (err) {
      setCancelError(err instanceof Error ? err.message : 'No se pudo cancelar la cita.');
    } finally {
      setIsCancelling(false);
    }
  };

  const handleRescheduled = () => {
    if (toReschedule) setNotice(`La cita ${toReschedule.code} fue reprogramada.`);
    setToReschedule(null);
    refetch();
  };

  const isFirstLoad = isLoading && appointments.length === 0;

  return (
    <section className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <SectionTitle
        eyebrow="Mis citas"
        title={patientName ? `Hola, ${patientName}` : 'Tus citas registradas'}
        subtitle="Puedes reprogramar o cancelar las citas pendientes o confirmadas de hoy en adelante."
        align="left"
      />

      {notice && (
        <p role="status" className="mt-6 flex items-center gap-2 rounded-xl bg-brand-50 px-3.5 py-2.5 text-sm text-brand-900">
          <CheckCircle2 size={16} className="shrink-0" />
          {notice}
        </p>
      )}

      <div className="mt-8">
        {isFirstLoad ? (
          <div className="flex justify-center py-8">
            <Spinner size={28} />
          </div>
        ) : error ? (
          <div className="flex flex-col items-start gap-3">
            <FormError message={error} />
            <div className="flex flex-wrap gap-2">
              <Button size="sm" icon={<RefreshCw size={15} />} onClick={refetch}>
                Reintentar
              </Button>
              <Button size="sm" variant="secondary" to="/consultar-citas">
                Volver a consultar
              </Button>
            </div>
          </div>
        ) : sorted.length === 0 ? (
          <EmptyState
            icon={CalendarX2}
            title="Aún no tienes citas registradas"
            description="Cuando reserves una cita, aparecerá en esta lista."
          />
        ) : (
          <div className="flex flex-col gap-4" aria-busy={isLoading}>
            {sorted.map((appointment) => (
              <PatientAppointmentCard
                key={appointment.id}
                appointment={appointment}
                canModify={canPatientModify(appointment, today)}
                onReschedule={() => {
                  setNotice(null);
                  setToReschedule(appointment);
                }}
                onCancel={() => {
                  setNotice(null);
                  setToCancel(appointment);
                }}
              />
            ))}
          </div>
        )}
      </div>

      <Modal
        isOpen={toCancel !== null}
        onClose={closeCancel}
        title="Cancelar cita"
        footer={
          <>
            <Button type="button" variant="admin-outline" onClick={closeCancel} disabled={isCancelling}>
              Volver
            </Button>
            <Button type="button" variant="admin-danger" onClick={handleCancel} disabled={isCancelling}>
              {isCancelling ? 'Cancelando…' : 'Sí, cancelar cita'}
            </Button>
          </>
        }
      >
        {toCancel && (
          <div className="flex flex-col gap-3 py-2">
            <p className="text-sm text-adm-ink-700">
              ¿Seguro que quieres cancelar la cita <span className="font-semibold">{toCancel.code}</span> del{' '}
              <span className="capitalize">{formatDateLong(toCancel.date)}</span> a las {toCancel.startTime}? El horario
              quedará libre para otros pacientes.
            </p>
            <FormError message={cancelError} />
          </div>
        )}
      </Modal>

      <PatientRescheduleModal
        dni={dni}
        code={code}
        appointment={toReschedule}
        onClose={() => setToReschedule(null)}
        onRescheduled={handleRescheduled}
      />
    </section>
  );
}

export default MyAppointmentsPage;
