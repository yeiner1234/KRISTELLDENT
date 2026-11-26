import { motion, useReducedMotion } from 'framer-motion';
import { CalendarPlus, Check, Clock, SearchCheck, Sparkle, UserRoundCheck, Zap } from 'lucide-react';
import Button from '../common/Button';
import { useProfessionals } from '../../hooks/useProfessionals';
import { getInitials } from '../../utils/format';
import clinicPhoto from '../../assets/images/home/consultorio.jpg';

const easing: [number, number, number, number] = [0.22, 0.61, 0.36, 1];

// Cada icono con uno de los colores del logotipo.
const trustItems = [
  { icon: UserRoundCheck, label: 'Atención profesional', tile: 'bg-brand-50 text-brand-700' },
  { icon: Zap, label: 'Reserva rápida', tile: 'bg-kd-pink-50 text-kd-pink-700' },
  { icon: Clock, label: 'Horarios disponibles', tile: 'bg-kd-aqua-50 text-kd-aqua-700' },
];

const avatarTones = ['bg-brand-600', 'bg-kd-pink-500', 'bg-kd-aqua-500', 'bg-brand-700'];

function HeroSection() {
  const shouldReduceMotion = useReducedMotion();
  const { professionals } = useProfessionals();
  const previewProfessionals = professionals.slice(0, 4);

  return (
    <section
      id="inicio"
      className="relative flex items-center overflow-hidden px-5 py-[72px] pb-20"
      style={{
        minHeight: 'min(90vh, 760px)',
        // Bruma aguamarina que se entibia en rosa, los dos colores del logotipo.
        background: 'linear-gradient(170deg, #ebf9fa 0%, #f4fbfc 55%, #fdf0f5 100%)',
      }}
    >
      {/* Formas quietas, sin animación: el único movimiento es la sonrisa. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-32 -top-32 h-[520px] w-[520px] rounded-full bg-kd-aqua-100/60"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 -left-20 h-[260px] w-[260px] rounded-full bg-kd-pink-100/50"
      />

      <div className="relative mx-auto grid w-full min-w-0 max-w-[1240px] grid-cols-1 items-center gap-14 lg:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-6">
          <motion.div
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 30 }}
            animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
            transition={shouldReduceMotion ? { duration: 0.18 } : { duration: 0.7, ease: easing }}
            className="flex flex-col gap-6"
          >
            <span className="inline-flex h-[32px] w-fit items-center gap-2 rounded-full border border-kd-pink-100 bg-white/80 px-4 text-[13px] font-semibold text-kd-pink-700">
              <Sparkle size={14} />
              Tu sonrisa, nuestra prioridad
            </span>

            <div className="flex flex-col">
              <h1
                className="text-pretty max-w-[17ch] text-[clamp(38px,5.4vw,62px)] font-semibold text-brand-900"
                style={{ lineHeight: 1.04, letterSpacing: '-0.015em' }}
              >
                Atención odontológica pensada para ti
              </h1>
              {/* La curva rosada de sonrisa del logotipo: se dibuja una vez al cargar. */}
              <svg aria-hidden="true" viewBox="0 0 320 30" className="mt-2 h-[26px] w-[min(300px,72%)]">
                <motion.path
                  d="M8 8 C 90 34, 230 34, 312 6"
                  fill="none"
                  stroke="#e0387f"
                  strokeWidth="7"
                  strokeLinecap="round"
                  initial={shouldReduceMotion ? { pathLength: 1 } : { pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={shouldReduceMotion ? { duration: 0 } : { duration: 1.1, delay: 0.5, ease: easing }}
                />
              </svg>
            </div>
          </motion.div>

          <motion.p
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 30 }}
            animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
            transition={shouldReduceMotion ? { duration: 0.18 } : { duration: 0.7, delay: 0.15, ease: easing }}
            className="text-pretty max-w-[50ch] text-[17px] text-ink-secondary"
            style={{ lineHeight: 1.68 }}
          >
            Reserva tu cita en minutos y consulta tus próximas visitas cuando quieras. Sin cuentas, sin
            contraseñas, sin llamadas de espera.
          </motion.p>

          <motion.div
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 30 }}
            animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
            transition={shouldReduceMotion ? { duration: 0.18 } : { duration: 0.7, delay: 0.28, ease: easing }}
            className="flex flex-wrap gap-3"
          >
            <Button to="/reservar" size="lg" icon={<CalendarPlus size={18} />} className="flex-[1_1_200px]">
              Reservar nueva cita
            </Button>
            <Button
              to="/consultar-citas"
              variant="secondary"
              size="lg"
              icon={<SearchCheck size={18} />}
              className="flex-[1_1_200px]"
            >
              Consultar mis citas
            </Button>
          </motion.div>

          <motion.div
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 30 }}
            animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
            transition={shouldReduceMotion ? { duration: 0.18 } : { duration: 0.7, delay: 0.4, ease: easing }}
            className="flex flex-wrap gap-x-6 gap-y-3 border-t border-[#dcebee] pt-6"
          >
            {trustItems.map(({ icon: Icon, label, tile }) => (
              <div key={label} className="flex items-center gap-2.5">
                <span className={`flex h-9 w-9 items-center justify-center rounded-[10px] ${tile}`}>
                  <Icon size={17} />
                </span>
                <span className="text-sm font-medium text-ink-secondary">{label}</span>
              </div>
            ))}
          </motion.div>
        </div>

        <motion.div
          initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, x: 30 }}
          animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1, x: 0 }}
          transition={shouldReduceMotion ? { duration: 0.18 } : { duration: 0.8, delay: 0.2, ease: easing }}
          className="relative mx-auto w-full min-w-0 max-w-md"
        >
          {/* Marco aguamarina desplazado detrás de la foto. */}
          <span aria-hidden="true" className="absolute -bottom-4 -right-4 left-6 top-6 rounded-[28px] bg-kd-aqua-300/45" />
          <div
            className="relative aspect-[4/3] w-full overflow-hidden rounded-[24px]"
            style={{
              background: 'linear-gradient(135deg, #cfe6ea, #e4f0f3)',
              boxShadow: 'var(--shadow-hero-image)',
            }}
          >
            <img
              src={clinicPhoto}
              alt="Consultorio dental moderno y luminoso"
              fetchPriority="high"
              className="h-full w-full object-cover"
            />
            {/* Un velo suave en los colores de la marca une la foto con la página. */}
            <div
              aria-hidden="true"
              className="absolute inset-0"
              style={{ background: 'linear-gradient(160deg, rgba(15,123,134,0.10), rgba(18,35,43,0.18))' }}
            />
          </div>

          <motion.div
            className={`absolute bottom-[-14px] left-[-10px] w-[225px] rounded-2xl p-4 ${
              shouldReduceMotion ? '' : 'animate-float-a'
            }`}
            style={{ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(12px)', boxShadow: 'var(--shadow-soft-hover)' }}
          >
            <p className="text-[12.5px] font-semibold text-kd-pink-700">Próxima disponibilidad</p>
            <p className="mt-1 text-[22px] font-semibold text-brand-900">Hoy 16:30</p>
            <p className="text-sm text-ink-secondary">Odontología general</p>
          </motion.div>

          <motion.div
            className={`absolute -right-3 -top-5 flex items-center gap-2 rounded-2xl p-3 ${
              shouldReduceMotion ? '' : 'animate-float-b'
            }`}
            style={{ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(12px)', boxShadow: 'var(--shadow-soft-hover)' }}
          >
            <span
              className="flex h-9 w-9 items-center justify-center rounded-full"
              style={{ background: 'var(--color-confirm-bg)', color: 'var(--color-confirm)' }}
            >
              <Check size={18} />
            </span>
            <div>
              <p className="text-sm font-semibold text-brand-900">Reserva confirmada</p>
              <p className="text-xs text-ink-secondary">Te enviamos el correo</p>
            </div>
          </motion.div>

          {previewProfessionals.length > 0 && (
            <div
              className="absolute -bottom-4 right-2 flex items-center gap-2 rounded-full px-3 py-2"
              style={{ background: '#12232b' }}
            >
              <div className="flex">
                {previewProfessionals.map((professional, index) => (
                  <span
                    key={professional.id}
                    className={`flex h-7 w-7 items-center justify-center rounded-full border-2 border-brand-900 text-[10px] font-semibold text-white ${avatarTones[index % avatarTones.length]}`}
                    style={{ marginLeft: index === 0 ? 0 : -9 }}
                  >
                    {getInitials(professional.fullName)}
                  </span>
                ))}
              </div>
              <span className="whitespace-nowrap text-xs font-medium text-white">
                {professionals.length} especialistas
              </span>
            </div>
          )}
        </motion.div>
      </div>
    </section>
  );
}

export default HeroSection;
