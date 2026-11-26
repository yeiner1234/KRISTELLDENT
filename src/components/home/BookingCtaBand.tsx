import { CalendarPlus, SearchCheck } from 'lucide-react';
import Button from '../common/Button';
import mascot from '../../../imagenes/kristelldent-icon.png';

// Cierre de la portada: la mascota de KristellDent invita a reservar. Debajo,
// la franja rosa y aguamarina del logotipo separa la banda del pie.
function BookingCtaBand() {
  return (
    <section aria-labelledby="cta-reserva" className="relative overflow-hidden bg-brand-900 px-5 pt-16">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 -top-24 h-[320px] w-[320px] rounded-full bg-brand-600/25"
      />
      <div className="relative mx-auto flex max-w-[1240px] flex-col items-center gap-8 pb-16 text-center md:flex-row md:text-left">
        <img
          src={mascot}
          alt="Mascota de KristellDent"
          className="h-28 w-28 shrink-0 rounded-full bg-white p-2 shadow-[0_0_0_6px_rgba(224,56,127,0.35)]"
        />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <h2 id="cta-reserva" className="text-pretty text-[clamp(26px,3.2vw,36px)] font-semibold text-white">
            ¿Agendamos tu próxima visita?
          </h2>
          <p className="max-w-[56ch] text-pretty text-[15.5px] leading-relaxed text-white/75">
            Elige sede, especialidad y horario en pocos pasos. Te enviamos el código de tu cita por correo.
          </p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <Button to="/reservar" size="lg" icon={<CalendarPlus size={18} />}>
            Reservar cita
          </Button>
          <Button to="/consultar-citas" variant="secondary" size="lg" icon={<SearchCheck size={18} />}>
            Consultar mis citas
          </Button>
        </div>
      </div>
      <div aria-hidden="true" className="relative -mx-5 flex h-1.5">
        <span className="flex-1 bg-kd-pink-500" />
        <span className="flex-1 bg-kd-aqua-500" />
      </div>
    </section>
  );
}

export default BookingCtaBand;
