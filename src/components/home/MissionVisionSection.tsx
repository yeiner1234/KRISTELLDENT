import { Eye, Target } from 'lucide-react';
import AnimatedSection from '../common/AnimatedSection';
import HorizontalCarousel from '../common/HorizontalCarousel';
import smilePhoto from '../../assets/images/home/sonrisa.jpg';

function MissionVisionSection() {
  return (
    <AnimatedSection className="relative overflow-hidden bg-kd-pink-50 py-[88px]">
      <svg
        aria-hidden="true"
        viewBox="0 0 200 240"
        className="pointer-events-none absolute -right-16 top-1/2 hidden w-[340px] -translate-y-1/2 opacity-[0.08] sm:block"
      >
        <path
          d="M100 10c-22 0-34 14-46 14-14 0-24-8-34-2-12 7-10 24-4 34 5 8 6 12 6 24 0 20 8 46 20 62 8 11 14 16 20 16 8 0 8-20 12-40 2-10 6-14 12-14s10 4 12 14c4 20 4 40 12 40 6 0 12-5 20-16 12-16 20-42 20-62 0-12 1-16 6-24 6-10 8-27-4-34-10-6-20 2-34 2-12 0-24-14-46-14z"
          fill="#e0387f"
        />
      </svg>

      <div className="relative mx-auto max-w-[1240px] min-w-0 px-5">
        <HorizontalCarousel
          ariaLabel="Misión y visión"
          itemClassName="w-[80vw] sm:w-[calc(50%-10px)] lg:w-[calc(33.333%-14px)]"
        >
        <div className="h-full min-w-0">
          <figure className="relative h-full min-h-[280px] overflow-hidden rounded-[20px]" style={{ boxShadow: 'var(--shadow-soft)' }}>
            <img
              src={smilePhoto}
              alt="Paciente sonriendo con dientes sanos"
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div
              aria-hidden="true"
              className="absolute inset-0"
              style={{ background: 'linear-gradient(180deg, rgba(18,35,43,0) 35%, rgba(18,35,43,0.82) 100%)' }}
            />
            <figcaption className="absolute inset-x-0 bottom-0 p-7">
              <p className="text-[13.5px] font-semibold text-kd-pink-100">Nuestro propósito</p>
              <p className="mt-1 text-pretty text-xl font-semibold text-white">Sonrisas sanas, explicadas paso a paso.</p>
            </figcaption>
          </figure>
        </div>

        <div className="h-full min-w-0">
          <div
            className="h-full rounded-[20px] border border-border bg-white p-8"
            style={{ boxShadow: 'var(--shadow-soft)' }}
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
              <Target size={22} />
            </span>
            <h3 className="mt-4 text-xl font-semibold text-brand-900">Misión</h3>
            <p className="mt-2 text-pretty text-sm leading-relaxed text-ink-secondary">
              Ofrecer tratamientos odontológicos precisos y comprensibles, con una agenda que respete el tiempo de
              cada paciente y un equipo que explique cada decisión clínica antes de tomarla.
            </p>
          </div>
        </div>

        <div className="h-full min-w-0">
          <div
            className="h-full rounded-[20px] p-8"
            style={{ background: 'linear-gradient(150deg, #12232b, #0a656e)' }}
          >
            <span
              className="flex h-11 w-11 items-center justify-center rounded-xl text-white"
              style={{ background: 'rgba(255,255,255,0.14)' }}
            >
              <Eye size={22} />
            </span>
            <h3 className="mt-4 text-xl font-semibold text-white">Visión</h3>
            <p className="mt-2 text-pretty text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.84)' }}>
              Ser la clínica de referencia de la zona norte en odontología digital, donde reservar una cita sea
              tan simple como consultar el horario y el historial de cada paciente viaje con él.
            </p>
          </div>
        </div>
        </HorizontalCarousel>
      </div>
    </AnimatedSection>
  );
}

export default MissionVisionSection;
