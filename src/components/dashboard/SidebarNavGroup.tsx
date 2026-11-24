import { useId, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ChevronDown, type LucideIcon } from 'lucide-react';

export interface SidebarGroupLink {
  label: string;
  to: string;
}

interface SidebarNavGroupProps {
  label: string;
  icon: LucideIcon;
  links: SidebarGroupLink[];
}

// Sección del menú lateral que se despliega con sus opciones (por ejemplo,
// "Imprimibles"). Empieza abierta si la página actual es una de ellas.
function SidebarNavGroup({ label, icon: Icon, links }: SidebarNavGroupProps) {
  const { pathname } = useLocation();
  const hasActiveLink = links.some((link) => pathname === link.to || pathname.startsWith(`${link.to}/`));
  const [isOpen, setIsOpen] = useState(hasActiveLink);
  const listId = useId();

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-controls={listId}
        className={`flex h-10 items-center gap-2.5 rounded-[9px] px-[11px] text-sm transition-colors duration-[140ms] hover:bg-white/5 ${
          hasActiveLink ? 'font-medium text-white' : 'text-[#93a8b0]'
        }`}
      >
        <Icon size={18} strokeWidth={1.75} />
        <span className="flex-1 text-left">{label}</span>
        <ChevronDown
          size={16}
          strokeWidth={1.75}
          className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <ul id={listId} className="flex flex-col gap-1">
          {links.map((link) => (
            <li key={link.to}>
              <NavLink
                to={link.to}
                className={({ isActive }) =>
                  `flex h-10 items-center gap-3 rounded-[9px] pl-[22px] pr-[11px] text-sm transition-colors duration-[140ms] ${
                    isActive ? 'bg-brand-600 font-medium text-white' : 'text-[#93a8b0] hover:bg-white/5'
                  }`
                }
              >
                <span aria-hidden="true" className="h-px w-2 shrink-0 bg-current opacity-70" />
                {link.label}
              </NavLink>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default SidebarNavGroup;
