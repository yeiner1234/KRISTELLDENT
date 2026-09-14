import { NavLink } from 'react-router-dom';
import {
  CalendarRange,
  ClipboardList,
  LayoutDashboard,
  Settings2,
  Tags,
  UserRound,
  Users,
  Wrench,
} from 'lucide-react';

const items = [
  { label: 'Dashboard', to: '/admin', icon: LayoutDashboard, end: true },
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
    <aside className="flex w-64 shrink-0 flex-col gap-1 border-r border-border bg-white p-4">
      <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-ink-tertiary">Administración</p>
      {items.map(({ label, to, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
              isActive ? 'bg-brand-600 text-white' : 'text-ink-secondary hover:bg-brand-50 hover:text-brand-700'
            }`
          }
        >
          <Icon size={18} />
          {label}
        </NavLink>
      ))}
    </aside>
  );
}

export default AdminSidebar;
