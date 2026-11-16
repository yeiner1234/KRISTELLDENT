import { CheckCircle2, MailCheck, MessageCircle } from 'lucide-react';
import { useLocation, Navigate } from 'react-router-dom';
import BookingShell from '../../components/booking/BookingShell';
import BookingSummary, { type BookingSummaryRow } from '../../components/booking/BookingSummary';
import Button from '../../components/common/Button';
import AppointmentCodeBox from '../../components/common/AppointmentCodeBox';
import { formatDateLong } from '../../utils/date';

interface SuccessState {
  branchName: string;
  branchRegion: string;
  professionalName: string;
  specialtyName: string;
  serviceName: string;
  date: string;
  time: string;
  appointmentCode: string;
  patientName: string;
  emailSent?: boolean;
}

function BookingSuccessPage() {
  const location = useLocation();
  const state = location.state as SuccessState | null;

  if (!state) {
    return <Navigate to="/" replace />;
  }

  const rows: BookingSummaryRow[] = [
    { label: 'Sucursal', value: state.branchName },
    { label: 'Profesional', value: state.professionalName },
    { label: 'Especialidad', value: state.specialtyName },
    { label: 'Servicio', value: state.serviceName },
    { label: 'Fecha', value: formatDateLong(state.date) },
    { label: 'Hora', value: state.time },
    { label: 'Sede', value: state.branchRegion },
  ];

  const whatsAppMessage = [
    `¡Hola ${state.patientName}! Aquí está la confirmación de tu cita en KristellDent:`,
    '',
    `Sucursal: ${state.branchName}`,
    `Profesional: ${state.professionalName}`,
    `Especialidad: ${state.specialtyName}`,
    `Servicio: ${state.serviceName}`,
    `Fecha: ${formatDateLong(state.date)}`,
    `Hora: ${state.time}`,
    `Código de cita: ${state.appointmentCode}`,
    'Con mi DNI y este código puedo reprogramar o cancelar la cita.',
  ].join('\n');

  const whatsAppUrl = `https://wa.me/?text=${encodeURIComponent(whatsAppMessage)}`;

  return (
    <BookingShell currentStep={8} hideFooter>
      <div className="flex flex-col items-center text-center">
        <span
          className="flex h-14 w-14 items-center justify-center rounded-full"
          style={{ background: 'var(--color-confirm-bg)', color: 'var(--color-confirm)' }}
        >
          <CheckCircle2 size={28} />
        </span>

        <h2 className="mt-4 text-[22px] font-semibold text-brand-900">Cita confirmada</h2>
        <p className="mt-1 max-w-sm text-sm leading-relaxed text-ink-tertiary">
          Tu cita ha sido registrada correctamente.
        </p>

        <div className="mt-6 w-full max-w-[600px]">
          <AppointmentCodeBox
            code={state.appointmentCode}
            hint="Guárdalo: con tu DNI y este código puedes reprogramar o cancelar tu cita"
          />
          {state.emailSent && (
            <p className="mt-3 flex items-center justify-center gap-1.5 text-sm text-ink-secondary">
              <MailCheck size={16} className="text-brand-700" />
              También te enviamos el código a tu correo.
            </p>
          )}
        </div>

        <div className="mt-4 w-full max-w-[600px]">
          <BookingSummary title="Detalles de la cita" rows={rows} />
        </div>

        <a
          href={whatsAppUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-brand-700 hover:text-brand-900"
        >
          <MessageCircle size={16} />
          Enviar mi reserva por WhatsApp
        </a>

        <div className="mt-7 flex w-full max-w-[600px] flex-col gap-3 sm:flex-row">
          <Button to="/" className="sm:flex-1">
            Volver al inicio
          </Button>
          <Button to="/consultar-citas" variant="secondary" className="sm:flex-1">
            Consultar mis citas
          </Button>
        </div>
      </div>
    </BookingShell>
  );
}

export default BookingSuccessPage;
