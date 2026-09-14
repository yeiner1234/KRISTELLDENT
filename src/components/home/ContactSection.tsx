import { Clock, Mail, MapPin, Phone } from 'lucide-react';
import AnimatedSection from '../common/AnimatedSection';
import SectionTitle from '../common/SectionTitle';

const contactRows = [
  { icon: MapPin, label: 'Dirección', value: 'Calle Mayor 14, 28013 Madrid' },
  { icon: Phone, label: 'Teléfono', value: '+34 912 000 000' },
  { icon: Mail, label: 'Correo', value: 'citas@clinica.com' },
  { icon: Clock, label: 'Horario de atención', value: 'Lunes a viernes 09:00–20:00 · Sábados 09:00–14:00' },
];

const blocks = [
  { x: 20, y: 20, w: 60, h: 40, fill: '#e2ebee' },
  { x: 100, y: 15, w: 45, h: 55, fill: '#dbe6ea' },
  { x: 20, y: 90, w: 50, h: 45, fill: '#dbe6ea' },
  { x: 100, y: 100, w: 60, h: 35, fill: '#e2ebee' },
  { x: 190, y: 20, w: 55, h: 50, fill: '#dbe6ea' },
  { x: 190, y: 100, w: 40, h: 40, fill: '#e2ebee' },
  { x: 20, y: 165, w: 65, h: 45, fill: '#dbe6ea' },
  { x: 115, y: 165, w: 50, h: 40, fill: '#e2ebee' },
  { x: 195, y: 170, w: 50, h: 35, fill: '#dbe6ea' },
];

function ContactSection() {
  return (
    <AnimatedSection id="contacto" className="bg-white py-24">
      <div className="mx-auto max-w-[1240px] px-5">
        <SectionTitle eyebrow="Contacto" title="Dónde estamos" align="left" />

        <div className="mt-10 grid min-w-0 grid-cols-1 gap-8 lg:grid-cols-2">
          <div className="flex min-w-0 flex-col gap-4">
            {contactRows.map(({ icon: Icon, label, value }) => (
              <div
                key={label}
                className="flex items-center gap-4 rounded-[15px] p-4"
                style={{ background: '#fbfdfe' }}
              >
                <span className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                  <Icon size={18} />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-brand-900">{label}</p>
                  <p className="text-sm text-ink-secondary">{value}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="relative min-h-[340px] min-w-0 overflow-hidden rounded-[20px]">
            <svg
              aria-hidden="true"
              viewBox="0 0 260 260"
              preserveAspectRatio="xMidYMid slice"
              className="absolute inset-0 h-full w-full"
            >
              <rect width="260" height="260" fill="#eef3f5" />
              {blocks.map((block) => (
                <rect
                  key={`${block.x}-${block.y}`}
                  x={block.x}
                  y={block.y}
                  width={block.w}
                  height={block.h}
                  fill={block.fill}
                  rx={4}
                />
              ))}
              {[0, 85, 170, 255].map((pos) => (
                <line key={`v-${pos}`} x1={pos} y1={0} x2={pos} y2={260} stroke="#ffffff" strokeWidth={6} />
              ))}
              {[0, 80, 155, 260].map((pos) => (
                <line key={`h-${pos}`} x1={0} y1={pos} x2={260} y2={pos} stroke="#ffffff" strokeWidth={6} />
              ))}
            </svg>

            <div className="absolute inset-0 flex items-center justify-center p-4">
              <div
                className="flex flex-col items-center gap-1 rounded-2xl px-5 py-4 text-center"
                style={{ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)', boxShadow: 'var(--shadow-soft-hover)' }}
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-white">
                  <MapPin size={18} />
                </span>
                <p className="text-sm font-semibold text-brand-900">Calle Mayor 14, Madrid</p>
                <p className="text-xs text-ink-tertiary">Mapa pendiente de integrar</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AnimatedSection>
  );
}

export default ContactSection;
