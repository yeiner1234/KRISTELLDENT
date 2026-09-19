import { Link } from 'react-router-dom';
import logoIcon from '../../../imagenes/kristelldent-icon.png';
import logoWordmark from '../../../imagenes/kristelldent-wordmark.png';
import { useBranches } from '../../hooks/useBranches';

const navigationLinks = [
  { label: 'Inicio', href: '#inicio' },
  { label: 'Nosotros', href: '#nosotros' },
  { label: 'Especialidades', href: '#especialidades' },
  { label: 'Profesionales', href: '#profesionales' },
];

function InstagramIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 3h-2a5 5 0 0 0-5 5v3H6v4h2v6h4v-6h3l1-4h-4V8a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

function LinkedinIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <line x1="8" y1="10" x2="8" y2="17" />
      <circle cx="8" cy="6.5" r="0.6" fill="currentColor" stroke="none" />
      <path d="M12 17v-4a2.5 2.5 0 0 1 5 0v4" />
      <line x1="12" y1="10" x2="12" y2="17" />
    </svg>
  );
}

const socialLinks = [
  { icon: InstagramIcon, label: 'Instagram' },
  { icon: FacebookIcon, label: 'Facebook' },
  { icon: LinkedinIcon, label: 'LinkedIn' },
];

function Footer() {
  const { branches } = useBranches();

  return (
    <footer style={{ background: '#12232b', color: '#cfe0e6' }} className="px-5 pb-[30px] pt-16">
      <div className="mx-auto grid max-w-[1240px] grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <img src={logoIcon} alt="" className="h-[42px] w-[42px]" />
            <img src={logoWordmark} alt="KristellDent" className="h-[20px]" />
          </div>
          <p className="text-sm leading-relaxed" style={{ color: 'rgba(207,224,230,0.8)' }}>
            Clínica odontológica con múltiples sedes y agenda abierta. Reserva y consulta tus citas sin crear
            cuenta.
          </p>
          <div className="flex gap-2">
            {socialLinks.map(({ icon: Icon, label }) => (
              <button
                key={label}
                type="button"
                aria-label={label}
                className="flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-white/10"
                style={{ background: 'rgba(255,255,255,0.08)' }}
              >
                <Icon />
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          <h4 className="text-[12.5px] font-semibold uppercase tracking-[0.09em]" style={{ color: 'rgba(207,224,230,0.6)' }}>
            Navegación
          </h4>
          {navigationLinks.map((link) => (
            <a key={link.href} href={link.href} className="text-sm hover:text-white">
              {link.label}
            </a>
          ))}
        </div>

        <div className="flex flex-col gap-2.5">
          <h4 className="text-[12.5px] font-semibold uppercase tracking-[0.09em]" style={{ color: 'rgba(207,224,230,0.6)' }}>
            Paciente
          </h4>
          <Link to="/reservar" className="text-sm hover:text-white">
            Reservar cita
          </Link>
          <Link to="/consultar-citas" className="text-sm hover:text-white">
            Consultar mis citas
          </Link>
          <a href="#especialidades" className="text-sm hover:text-white">
            Tratamientos
          </a>
          <a href="#contacto" className="text-sm hover:text-white">
            Preguntas frecuentes
          </a>
        </div>

        <div className="flex flex-col gap-2.5">
          <h4 className="text-[12.5px] font-semibold uppercase tracking-[0.09em]" style={{ color: 'rgba(207,224,230,0.6)' }}>
            Sedes
          </h4>
          {branches.map((branch) => (
            <span key={branch.id} className="text-sm">
              {branch.name}
            </span>
          ))}
          <a href="#contacto" className="mt-1 text-sm hover:text-white">
            Ver ubicaciones
          </a>
        </div>
      </div>

      <div
        className="mx-auto mt-12 flex max-w-[1240px] flex-wrap items-center justify-between gap-3 border-t pt-6 text-xs"
        style={{ borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(207,224,230,0.7)' }}
      >
        <span>© 2026 KristellDent. Todos los derechos reservados.</span>
        <div className="flex gap-5">
          <span>Aviso legal</span>
          <span>Privacidad</span>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
