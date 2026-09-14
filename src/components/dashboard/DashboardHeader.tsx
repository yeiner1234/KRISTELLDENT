import { LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

interface DashboardHeaderProps {
  heading: string;
}

function DashboardHeader({ heading }: DashboardHeaderProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="flex items-center justify-between border-b border-border bg-white px-6 py-4">
      <h1 className="text-lg font-semibold text-brand-900">{heading}</h1>
      <div className="flex items-center gap-4">
        {user && <span className="text-sm text-ink-tertiary">{user.email}</span>}
        <button
          type="button"
          onClick={handleLogout}
          className="flex items-center gap-2 text-sm font-medium text-ink-tertiary hover:text-rose-600"
        >
          <LogOut size={16} />
          Cerrar sesión
        </button>
      </div>
    </header>
  );
}

export default DashboardHeader;
