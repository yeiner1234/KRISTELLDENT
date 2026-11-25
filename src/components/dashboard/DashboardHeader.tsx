import { useState } from 'react';
import { Bell, LogOut, Menu } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import SearchInput from '../common/SearchInput';
import Avatar from '../common/Avatar';
import AvatarUploadModal from '../profile/AvatarUploadModal';
import type { AppRole } from '../../types/User';

interface DashboardHeaderProps {
  heading: string;
  variant?: 'admin' | 'professional';
  // Celular y tablet: nombre de la sección y botón del menú lateral.
  sectionTitle?: string | null;
  isMenuOpen?: boolean;
  onMenuClick?: () => void;
}

const today = new Date().toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' });

const roleLabels: Record<AppRole, string> = {
  admin_global: 'Administrador global',
  admin_sede: 'Administrador de sede',
  especialista: 'Especialista',
  odontologa_general: 'Odontóloga general',
  tecnica: 'Técnica',
};

// Desde lg es la cabecera de siempre. Por debajo queda fija arriba, con el
// botón de menú, el nombre de la sección y "Cerrar sesión" como icono.
function DashboardHeader({ heading, variant = 'admin', sectionTitle, isMenuOpen = false, onMenuClick }: DashboardHeaderProps) {
  const { user, logout, setAvatarPath } = useAuth();
  const navigate = useNavigate();
  const [isPhotoOpen, setIsPhotoOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-30 flex min-h-16 flex-wrap items-center justify-between gap-3 border-b border-adm-line-card bg-white px-4 py-3 sm:px-[26px] lg:static lg:z-auto">
      <div className="flex min-w-0 flex-1 items-center gap-1 lg:contents">
        {onMenuClick && (
          <button
            type="button"
            onClick={onMenuClick}
            aria-label={isMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={isMenuOpen}
            aria-controls="panel-menu"
            className="-ml-2.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] text-adm-ink-700 transition-colors hover:bg-adm-surface-hover lg:hidden"
          >
            <Menu size={22} />
          </button>
        )}
        <h1 className="min-w-0 text-lg font-semibold tracking-[-0.01em] text-adm-ink-700">
          <span className="block truncate lg:hidden">{sectionTitle ?? heading}</span>
          <span className="hidden lg:inline">{heading}</span>
        </h1>
      </div>

      {variant === 'admin' ? (
        <div className="flex items-center gap-3">
          <div className="hidden lg:contents">
            <SearchInput wrapperClassName="w-60 max-w-[40vw]" placeholder="Buscar..." />
            <button
              type="button"
              aria-label="Notificaciones"
              className="flex h-9 w-9 items-center justify-center rounded-[9px] border border-adm-line-control text-adm-ink-400 transition-colors hover:bg-adm-surface-hover"
            >
              <Bell size={17} strokeWidth={1.75} />
            </button>
          </div>

          <div className="flex items-center gap-1 lg:gap-3 lg:border-l lg:border-adm-line-card lg:pl-3">
            <button
              type="button"
              onClick={() => setIsPhotoOpen(true)}
              disabled={!user}
              aria-label="Cambiar mi foto de perfil"
              title="Cambiar mi foto de perfil"
              className="rounded-full transition-shadow hover:ring-2 hover:ring-adm-accent-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
            >
              <Avatar name={user?.name ?? 'Usuario'} path={user?.avatarPath} className="h-[34px] w-[34px] text-[13px]" />
            </button>
            <div className="hidden flex-col leading-tight lg:flex">
              <span className="text-[13px] font-semibold text-adm-ink-700">{user?.name ?? 'Usuario'}</span>
              <span className="text-xs text-adm-ink-300">{user ? roleLabels[user.role] : ''}</span>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              aria-label="Cerrar sesión"
              className="flex h-11 w-11 items-center justify-center rounded-lg text-adm-ink-300 transition-colors hover:bg-adm-line-faint hover:text-adm-danger-text lg:h-8 lg:w-8"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-4">
          <span className="hidden text-[13px] text-adm-ink-300 lg:inline">{today}</span>
          <button
            type="button"
            onClick={handleLogout}
            aria-label="Cerrar sesión"
            className="flex min-h-11 min-w-11 items-center justify-center gap-2 text-sm font-medium text-adm-ink-400 transition-colors hover:text-adm-danger-text lg:min-h-0 lg:min-w-0"
          >
            <LogOut size={16} />
            <span className="hidden lg:inline">Cerrar sesión</span>
          </button>
        </div>
      )}
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
    </header>
  );
}

export default DashboardHeader;
