import { NavLink } from 'react-router-dom';
import {
  Building2,
  CalendarRange,
  CircleHelp,
  ClipboardList,
  LayoutDashboard,
  Settings2,
  Tags,
  UserRound,
  Users,
  UsersRound,
  Wrench,
} from 'lucide-react';
import logo from '../../../imagenes/kristelldent-icon.png';

const items = [
  { label: 'Dashboard', to: '/admin', icon: LayoutDashboard, end: true },
  { label: 'Sedes', to: '/admin/sedes', icon: Building2 },
  { label: 'Equipo', to: '/admin/equipo', icon: UsersRound },
  { label: 'Agenda', to: '/admin/agenda', icon: CalendarRange },
  { label: 'Citas', to: '/admin/citas', icon: ClipboardList },
  { label: 'Pacientes', to: '/admin/pacientes', icon: Users },
  { label: 'Profesionales', to: '/admin/profesionales', icon: UserRound },
  { label: 'Especialidades', to: '/admin/especialidades', icon: Tags },
  { label: 'Servicios', to: '/admin/servicios', icon: Wrench },
  { label: 'Configuración', to: '/admin/configuracion', icon: Settings2 },
];

function AdminSidebar() {
  return (
    <aside className="flex w-[244px] shrink-0 flex-col gap-[22px] bg-brand-900 p-[20px_14px]">
      <div className="flex items-center gap-2.5 px-1">
        <img src={logo} alt="" className="h-[30px] w-[30px] rounded-[9px]" />
        <div className="flex flex-col leading-tight">
          <span className="text-[15px] font-semibold text-white">KristellDent</span>
          <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#7fa3ab]">Admin</span>
        </div>
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

      <div className="mt-auto flex flex-col gap-2 rounded-xl bg-white/[0.06] p-3.5">
        <p className="flex items-center gap-1.5 text-[13px] font-semibold text-white">
          <CircleHelp size={15} />
          ¿Necesitas ayuda?
        </p>
        <p className="text-xs leading-[1.5] text-[#8aa3ab]">
          Consulta la guía rápida del panel administrativo o contacta a soporte.
        </p>
        <button
          type="button"
          className="h-8 rounded-lg border border-white/[0.14] text-xs font-medium text-white transition-colors hover:bg-white/10"
        >
          Ver ayuda
        </button>
      </div>
    </aside>
  );
}

export default AdminSidebar;
