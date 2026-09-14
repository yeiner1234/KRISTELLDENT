import { CheckCircle2 } from 'lucide-react';
import Button from '../../components/common/Button';

function BookingSuccessPage() {
  return (
    <section className="mx-auto flex max-w-lg flex-col items-center px-4 py-16 text-center sm:px-6">
      <CheckCircle2 size={64} className="text-emerald-500" />
      <h1 className="mt-6 text-2xl font-bold text-brand-900">Cita registrada correctamente</h1>
      <p className="mt-2 text-ink-secondary">
        Te enviaremos un recordatorio antes de tu cita. Puedes consultar el estado desde "Mis citas".
      </p>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button to="/">Volver al inicio</Button>
        <Button to="/consultar-citas" variant="secondary">
          Consultar mis citas
        </Button>
      </div>
    </section>
  );
}

export default BookingSuccessPage;
