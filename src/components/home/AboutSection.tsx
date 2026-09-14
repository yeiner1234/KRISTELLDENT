import { Award, HeartHandshake, ScanLine } from 'lucide-react';
import AnimatedSection from '../common/AnimatedSection';
import SectionTitle from '../common/SectionTitle';

const highlights = [
  {
    icon: Award,
    title: 'Experiencia',
    text: 'Más de una década tratando casos de ortodoncia, endodoncia y cirugía en la misma clínica.',
  },
  {
    icon: HeartHandshake,
    title: 'Atención personalizada',
    text: 'Un profesional de referencia por paciente, que sigue su caso de principio a fin.',
  },
  {
    icon: ScanLine,
    title: 'Tecnología moderna',
    text: 'Radiografía digital, escáner intraoral y planificación 3D antes de cada intervención.',
  },
];

function AboutSection() {
  return (
    <AnimatedSection id="nosotros" className="bg-white py-24">
      <div className="mx-auto grid max-w-[1240px] min-w-0 grid-cols-1 items-center gap-[60px] px-5 lg:grid-cols-2">
        <div className="relative min-w-0">
          <div
            aria-hidden="true"
            className="aspect-[5/4] w-full rounded-[20px]"
            style={{ background: 'linear-gradient(135deg, #dfeef1, #eff7f9)' }}
          />
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
            {highlights.map(({ icon: Icon, title, text }) => (
              <div key={title} className="flex flex-col gap-2.5">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-tint text-brand-600">
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
