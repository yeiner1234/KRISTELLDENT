import { useEffect, useState, type MouseEvent, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import DashboardHeader from './DashboardHeader';
import { useAuth } from '../../hooks/useAuth';
import { getPanelSectionTitle } from '../../utils/panelSection';

interface PanelShellProps {
  sidebar: ReactNode;
  heading: string;
  variant: 'admin' | 'professional';
  mainClassName: string;
  children: ReactNode;
}

// Estructura de los paneles. Desde lg el sidebar queda fijo a la izquierda,
// como siempre. En celular y tablet se oculta y se abre desde el botón de
// menú de la cabecera como panel deslizable; se cierra al elegir una opción,
// al tocar el fondo oscuro o con Escape.
function PanelShell({ sidebar, heading, variant, mainClassName, children }: PanelShellProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { pathname } = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    if (!isMenuOpen) {
      return undefined;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isMenuOpen]);

  // Elegir una opción del menú (un enlace) lo cierra.
  const handleMenuClick = (event: MouseEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('a')) {
      setIsMenuOpen(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-adm-surface-app">
      {isMenuOpen && (
        <div
          data-testid="panel-menu-backdrop"
          aria-hidden="true"
          className="fixed inset-0 z-40 bg-[rgba(18,35,43,0.42)] lg:hidden print:hidden"
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      <div
        id="panel-menu"
        data-open={isMenuOpen}
        onClick={handleMenuClick}
        className={`fixed inset-y-0 left-0 z-50 flex overflow-y-auto transition-[translate,visibility] duration-200 lg:visible lg:static lg:z-auto lg:translate-x-0 lg:overflow-visible lg:transition-none ${
          isMenuOpen ? 'visible translate-x-0' : 'invisible -translate-x-full'
        }`}
      >
        {sidebar}
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardHeader
          heading={heading}
          variant={variant}
          sectionTitle={getPanelSectionTitle(pathname, user?.role)}
          isMenuOpen={isMenuOpen}
          onMenuClick={() => setIsMenuOpen((open) => !open)}
        />
        <main className={mainClassName}>{children}</main>
      </div>
    </div>
  );
}

export default PanelShell;
