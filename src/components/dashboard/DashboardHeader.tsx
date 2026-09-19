import { Bell, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import SearchInput from '../common/SearchInput';
import type { AppRole } from '../../types/User';

interface DashboardHeaderProps {
  heading: string;
  variant?: 'admin' | 'professional';
}

const today = new Date().toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' });

const roleLabels: Record<AppRole, string> = {
  admin_global: 'Administrador global',
  admin_sede: 'Administrador de sede',
  especialista: 'Especialista',
  tecnica: 'Técnica',
};

function DashboardHeader({ heading, variant = 'admin' }: DashboardHeaderProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const initials = user?.name ? user.name.slice(0, 2).toUpperCase() : '--';

  return (
    <header className="flex min-h-16 flex-wrap items-center justify-between gap-3 border-b border-adm-line-card bg-white px-[26px] py-3">
      <h1 className="text-lg font-semibold tracking-[-0.01em] text-adm-ink-700">{heading}</h1>

      {variant === 'admin' ? (
        <div className="flex items-center gap-3">
          <SearchInput wrapperClassName="w-60 max-w-[40vw]" placeholder="Buscar..." />
          <button
            type="button"
            aria-label="Notificaciones"
            className="flex h-9 w-9 items-center justify-center rounded-[9px] border border-adm-line-control text-adm-ink-400 transition-colors hover:bg-adm-surface-hover"
          >
            <Bell size={17} strokeWidth={1.75} />
          </button>

          <div className="flex items-center gap-3 border-l border-adm-line-card pl-3">
            <span className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-[#dceef0] text-[13px] font-semibold text-adm-accent-deep">
              {initials}
            </span>
            <div className="flex flex-col leading-tight">
              <span className="text-[13px] font-semibold text-adm-ink-700">{user?.name ?? 'Usuario'}</span>
              <span className="text-xs text-adm-ink-300">{user ? roleLabels[user.role] : ''}</span>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              aria-label="Cerrar sesión"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-adm-ink-300 transition-colors hover:bg-adm-line-faint hover:text-adm-danger-text"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-4">
          <span className="text-[13px] text-adm-ink-300">{today}</span>
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm font-medium text-adm-ink-400 transition-colors hover:text-adm-danger-text"
          >
            <LogOut size={16} />
            Cerrar sesión
          </button>
        </div>
      )}
    </header>
  );
}

export default DashboardHeader;
