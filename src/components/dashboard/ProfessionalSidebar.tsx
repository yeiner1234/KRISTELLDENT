import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { CalendarRange, Camera, ClipboardList, LayoutDashboard, Printer, Users } from 'lucide-react';
import logo from '../../../imagenes/kristelldent-icon.png';
import { useAuth } from '../../hooks/useAuth';
import SidebarNavGroup from './SidebarNavGroup';
import Avatar from '../common/Avatar';
import AvatarUploadModal from '../profile/AvatarUploadModal';

const professionalItems = [
  { label: 'Dashboard', to: '/profesional', icon: LayoutDashboard, end: true },
  { label: 'Mi agenda', to: '/profesional/agenda', icon: CalendarRange },
  { label: 'Mis pacientes', to: '/profesional/pacientes', icon: Users },
  { label: 'Mis citas', to: '/profesional/citas', icon: ClipboardList },
];

const technicianItems = [
  { label: 'Citas', to: '/profesional', icon: ClipboardList, end: true },
  { label: 'Agenda', to: '/profesional/agenda-sede', icon: CalendarRange },
  { label: 'Pacientes', to: '/profesional/pacientes-sede', icon: Users },
];

// Imprimibles: solo la técnica (la especialista y la odontóloga general no tienen).
const technicianPrintables = [{ label: 'Agenda de citas', to: '/profesional/reportes/agenda' }];

function ProfessionalSidebar() {
  const { user, setAvatarPath } = useAuth();
  const [isPhotoOpen, setIsPhotoOpen] = useState(false);
  const isTechnician = user?.role === 'tecnica';
  const items = isTechnician ? technicianItems : professionalItems;

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
        {isTechnician && <SidebarNavGroup label="Imprimibles" icon={Printer} links={technicianPrintables} />}
      </nav>

      {/* Al tocar su nombre o su foto, la persona cambia su foto de perfil. */}
      <button
        type="button"
        onClick={() => setIsPhotoOpen(true)}
        disabled={!user}
        aria-label="Cambiar mi foto de perfil"
        className="group mt-auto flex items-center gap-2.5 rounded-[10px] border-t border-white/[0.12] px-2 pb-1 pt-3 text-left transition-colors hover:bg-white/5"
      >
        <span className="relative">
          <Avatar name={user?.name ?? 'Profesional'} path={user?.avatarPath} className="h-9 w-9 text-xs" />
          <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-brand-600 text-white ring-2 ring-brand-900">
            <Camera size={9} />
          </span>
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-[13px] font-semibold text-white">{user?.name ?? 'Profesional'}</span>
          <span className="truncate text-xs text-[#8aa3ab] group-hover:text-white">Cambiar mi foto</span>
        </span>
      </button>

      {isPhotoOpen && user && (
        <AvatarUploadModal
          userId={user.id}
          name={user.name}
          role={user.role}
          avatarPath={user.avatarPath}
          isOwn
          onClose={() => setIsPhotoOpen(false)}
          onChanged={setAvatarPath}
        />
      )}
    </aside>
  );
}

export default ProfessionalSidebar;
