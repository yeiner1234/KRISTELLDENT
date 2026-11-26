import { Award, HeartHandshake, ScanLine } from 'lucide-react';
import AnimatedSection from '../common/AnimatedSection';
import SectionTitle from '../common/SectionTitle';
import teamPhoto from '../../assets/images/home/doctora-paciente.jpg';

const highlights = [
  {
    icon: Award,
    title: 'Experiencia',
    text: 'Más de una década tratando casos de ortodoncia, endodoncia y cirugía en la misma clínica.',
    tile: 'bg-brand-50 text-brand-700',
  },
  {
    icon: HeartHandshake,
    title: 'Atención personalizada',
    text: 'Un profesional de referencia por paciente, que sigue su caso de principio a fin.',
    tile: 'bg-kd-pink-50 text-kd-pink-700',
  },
  {
    icon: ScanLine,
    title: 'Tecnología moderna',
    text: 'Radiografía digital, escáner intraoral y planificación 3D antes de cada intervención.',
    tile: 'bg-kd-aqua-50 text-kd-aqua-700',
  },
];

function AboutSection() {
  return (
    <AnimatedSection id="nosotros" className="bg-white py-24">
      <div className="mx-auto grid max-w-[1240px] min-w-0 grid-cols-1 items-center gap-[60px] px-5 lg:grid-cols-2">
        <div className="relative min-w-0">
          <div
            className="aspect-[5/4] w-full overflow-hidden rounded-[20px]"
            style={{ background: 'linear-gradient(135deg, #dfeef1, #eff7f9)', boxShadow: 'var(--shadow-hero-image)' }}
          >
            <img
              src={teamPhoto}
              alt="Odontóloga atendiendo a una paciente en el consultorio"
              loading="lazy"
              className="h-full w-full object-cover"
            />
          </div>
          <div
            className="absolute rounded-2xl bg-white px-5 py-4"
            style={{ right: '-12px', bottom: '-18px', boxShadow: 'var(--shadow-soft-hover)' }}
          >
            <p className="text-[26px] font-semibold text-brand-600">14 años</p>
            <p className="text-sm text-ink-secondary">cuidando sonrisas</p>
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          <SectionTitle
            eyebrow="Sobre nosotros"
            title="Una clínica donde el paciente decide su tiempo"
            align="left"
          />
          <p className="text-pretty text-base leading-relaxed text-ink-secondary">
            Somos un equipo de cinco especialistas que trabaja con protocolos clínicos claros y agenda abierta.
            Cada tratamiento se explica antes de empezar, con presupuesto cerrado y tiempos reales. Nada de
            esperas sin explicación ni sorpresas en la factura.
          </p>

          <div className="grid gap-5 sm:grid-cols-3">
            {highlights.map(({ icon: Icon, title, text, tile }) => (
              <div key={title} className="flex flex-col gap-2.5">
                <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tile}`}>
                  <Icon size={20} />
                </span>
                <p className="text-sm font-semibold text-brand-900">{title}</p>
                <p className="text-[13.5px] leading-relaxed text-ink-secondary">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AnimatedSection>
  );
}

export default AboutSection;
