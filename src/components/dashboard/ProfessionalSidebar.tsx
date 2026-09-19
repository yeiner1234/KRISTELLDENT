import { NavLink } from 'react-router-dom';
import { CalendarRange, ClipboardList, LayoutDashboard, Users } from 'lucide-react';
import logo from '../../../imagenes/kristelldent-icon.png';
import { useAuth } from '../../hooks/useAuth';

const items = [
  { label: 'Dashboard', to: '/profesional', icon: LayoutDashboard, end: true },
  { label: 'Mi agenda', to: '/profesional/agenda', icon: CalendarRange },
  { label: 'Mis pacientes', to: '/profesional/pacientes', icon: Users },
  { label: 'Mis citas', to: '/profesional/citas', icon: ClipboardList },
];

function ProfessionalSidebar() {
  const { user } = useAuth();
  const initials = user?.name ? user.name.slice(0, 2).toUpperCase() : 'PR';

  return (
    <aside className="flex w-[244px] shrink-0 flex-col gap-[22px] bg-brand-900 p-[20px_14px]">
      <div className="flex items-center gap-2.5 px-1">
        <img src={logo} alt="" className="h-[30px] w-[30px] rounded-[9px]" />
        <span className="text-[15px] font-semibold text-white">KristellDent</span>
      </div>

      <nav className="flex flex-col gap-1">
        {items.map(({ label, to, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex h-10 items-center gap-2.5 rounded-[9px] px-[11px] text-sm transition-colors duration-[140ms] ${
                isActive ? 'bg-brand-600 font-medium text-white' : 'text-[#93a8b0] hover:bg-white/5'
              }`
            }
          >
            <Icon size={18} strokeWidth={1.75} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto flex items-center gap-2.5 border-t border-white/[0.12] px-2 pt-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1e3a44] text-xs font-semibold text-[#9fc4c9]">
          {initials}
        </span>
        <div className="flex min-w-0 flex-col">
          <p className="truncate text-[13px] font-semibold text-white">{user?.name ?? 'Profesional'}</p>
          <p className="truncate text-xs text-[#8aa3ab]">Panel profesional</p>
        </div>
      </div>
    </aside>
  );
}

export default ProfessionalSidebar;
