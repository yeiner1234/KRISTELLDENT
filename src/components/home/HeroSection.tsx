import { motion, useReducedMotion } from 'framer-motion';
import { CalendarPlus, Check, Clock, SearchCheck, Sparkle, UserRoundCheck, Zap } from 'lucide-react';
import Button from '../common/Button';
import { useProfessionals } from '../../hooks/useProfessionals';
import { getInitials } from '../../utils/format';

const easing: [number, number, number, number] = [0.22, 0.61, 0.36, 1];

const trustItems = [
  { icon: UserRoundCheck, label: 'Atención profesional' },
  { icon: Zap, label: 'Reserva rápida' },
  { icon: Clock, label: 'Horarios disponibles' },
];

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
        background: 'linear-gradient(168deg, #eff7f9 0%, #e4f0f3 52%, #dfedf1 100%)',
      }}
    >
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute -right-24 -top-24 h-[620px] w-[620px] rounded-full ${
          shouldReduceMotion ? '' : 'animate-drift'
        }`}
        style={{ background: 'radial-gradient(circle, rgba(15,123,134,0.16), transparent 68%)' }}
      />

      <svg
        aria-hidden="true"
        viewBox="0 0 200 240"
        className="pointer-events-none absolute -bottom-6 left-0 hidden w-[280px] opacity-[0.12] sm:block"
      >
        <motion.path
          d="M100 10c-22 0-34 14-46 14-14 0-24-8-34-2-12 7-10 24-4 34 5 8 6 12 6 24 0 20 8 46 20 62 8 11 14 16 20 16 8 0 8-20 12-40 2-10 6-14 12-14s10 4 12 14c4 20 4 40 12 40 6 0 12-5 20-16 12-16 20-42 20-62 0-12 1-16 6-24 6-10 8-27-4-34-10-6-20 2-34 2-12 0-24-14-46-14z"
          fill="none"
          stroke="#0f7b86"
          strokeWidth="1.6"
          strokeDasharray={900}
          initial={shouldReduceMotion ? { strokeDashoffset: 0 } : { strokeDashoffset: 900 }}
          animate={{ strokeDashoffset: 0 }}
          transition={shouldReduceMotion ? { duration: 0 } : { duration: 2.8, ease: 'easeOut' }}
        />
      </svg>

      <div className="relative mx-auto grid w-full min-w-0 max-w-[1240px] grid-cols-1 items-center gap-14 lg:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-6">
          <motion.div
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 30 }}
            animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
            transition={shouldReduceMotion ? { duration: 0.18 } : { duration: 0.7, ease: easing }}
            className="flex flex-col gap-6"
          >
            <span
              className="inline-flex h-[30px] w-fit items-center gap-2 rounded-full border px-4 text-[12.5px] font-semibold text-brand-700"
              style={{ background: '#eef6f7', borderColor: 'rgba(15,123,134,0.16)' }}
            >
              <Sparkle size={14} />
              Tu sonrisa, nuestra prioridad
            </span>

            <h1
              className="text-pretty max-w-[18ch] text-[clamp(36px,5.2vw,58px)] font-semibold text-brand-900"
              style={{ lineHeight: 1.08, letterSpacing: '-0.035em' }}
            >
              Atención odontológica pensada para ti
            </h1>
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
            className="flex flex-wrap gap-6 border-t border-border pt-6"
          >
            {trustItems.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                  <Icon size={16} />
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
          <div
            aria-hidden="true"
            className="aspect-[4/3] w-full rounded-[20px]"
            style={{
              background: 'linear-gradient(135deg, #cfe6ea, #e4f0f3)',
              boxShadow: 'var(--shadow-hero-image)',
            }}
          />

          <motion.div
            className={`absolute bottom-[-14px] left-[-10px] w-[225px] rounded-2xl p-4 ${
              shouldReduceMotion ? '' : 'animate-float-a'
            }`}
            style={{ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(12px)', boxShadow: 'var(--shadow-soft-hover)' }}
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-brand-700">
              Próxima disponibilidad
            </p>
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
                    className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-brand-900 bg-brand-600 text-[10px] font-semibold text-white"
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
