import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Activity, ArrowRight, Menu, X } from 'lucide-react';
import Button from '../common/Button';

const institutionalLinks = [
  { label: 'Inicio', href: '#inicio' },
  { label: 'Nosotros', href: '#nosotros' },
  { label: 'Especialidades', href: '#especialidades' },
  { label: 'Profesionales', href: '#profesionales' },
  { label: 'Contacto', href: '#contacto' },
];

function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 24);
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className="sticky top-0 z-40 h-[72px] border-b transition-[background,box-shadow,border-color] duration-300"
      style={{
        background: isScrolled ? 'rgba(255,255,255,0.82)' : 'rgba(255,255,255,0.4)',
        backdropFilter: isScrolled ? 'blur(14px)' : 'blur(6px)',
        borderBottomColor: isScrolled ? '#e6ebef' : 'transparent',
        boxShadow: isScrolled ? 'var(--shadow-navbar)' : 'none',
      }}
    >
      <div className="mx-auto flex h-full max-w-[1240px] items-center justify-between px-5">
        <a href="#inicio" className="flex items-center gap-2.5">
          <span
            className="flex h-[34px] w-[34px] items-center justify-center rounded-[11px]"
            style={{ background: 'linear-gradient(140deg, #0f7b86, #0a656e)' }}
          >
            <Activity size={18} className="text-white" strokeWidth={2.4} />
          </span>
          <span className="whitespace-nowrap text-[17px] font-semibold text-brand-900">Clínica Sonrisa</span>
        </a>

        <nav className="hidden items-center gap-7 min-[1000px]:flex">
          {institutionalLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="whitespace-nowrap text-sm font-medium text-ink-secondary transition-colors hover:text-brand-700"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden min-[1000px]:block">
          <Button to="/reservar" size="sm" icon={<ArrowRight size={16} />}>
            Reservar cita
          </Button>
        </div>

        <button
          type="button"
          className="flex h-[42px] w-[42px] items-center justify-center rounded-[11px] text-brand-900 min-[1000px]:hidden"
          aria-label={isMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={isMenuOpen}
          onClick={() => setIsMenuOpen((open) => !open)}
        >
          {isMenuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      <AnimatePresence>
        {isMenuOpen && (
          <motion.nav
            className="absolute inset-x-4 top-[72px] rounded-2xl min-[1000px]:hidden"
            style={{
              background: 'rgba(255,255,255,0.96)',
              backdropFilter: 'blur(14px)',
              boxShadow: 'var(--shadow-panel)',
            }}
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -10, scale: 0.97 }}
            transition={shouldReduceMotion ? { duration: 0.14 } : { duration: 0.26, ease: [0.22, 0.61, 0.36, 1] }}
          >
            <div className="flex flex-col gap-1 p-4">
              {institutionalLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsMenuOpen(false)}
                  className="rounded-xl px-3 py-2.5 text-sm font-medium text-ink-secondary hover:bg-brand-50 hover:text-brand-700"
                >
                  {link.label}
                </a>
              ))}
              <div className="px-1 pt-2">
                <Button
                  to="/reservar"
                  size="sm"
                  icon={<ArrowRight size={16} />}
                  className="w-full"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Reservar cita
                </Button>
              </div>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}

export default Navbar;
