import type { AppRole } from '../types/User';

// Nombre de la sección que se muestra en la cabecera móvil de los paneles.
// Debe coincidir con las etiquetas de AdminSidebar y ProfessionalSidebar.
const SECTION_TITLES: Record<string, string> = {
  '/admin': 'Dashboard',
  '/admin/indicadores': 'Indicadores',
  '/admin/sedes': 'Sedes',
  '/admin/equipo': 'Equipo',
  '/admin/agenda': 'Agenda',
  '/admin/citas': 'Citas',
  '/admin/reportes/agenda': 'Agenda de citas',
  '/admin/pacientes': 'Pacientes',
  '/admin/profesionales': 'Profesionales',
  '/admin/especialidades': 'Especialidades',
  '/admin/servicios': 'Servicios de la sede',
  '/admin/configuracion': 'Configuración',
  '/profesional/agenda': 'Mi agenda',
  '/profesional/pacientes': 'Mis pacientes',
  '/profesional/citas': 'Mis citas',
  '/profesional/agenda-sede': 'Agenda',
  '/profesional/pacientes-sede': 'Pacientes',
  '/profesional/reportes/agenda': 'Agenda de citas',
};

export function getPanelSectionTitle(pathname: string, role: AppRole | undefined): string | null {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;

  // La técnica empieza en "Citas" de su sede; las profesionales, en su dashboard.
  if (path === '/profesional') {
    return role === 'tecnica' ? 'Citas' : 'Dashboard';
  }

  return SECTION_TITLES[path] ?? null;
}
