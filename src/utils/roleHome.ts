import type { AppRole } from '../types/User';

export function isAdminRole(role: AppRole): boolean {
  return role === 'admin_global' || role === 'admin_sede';
}

// Panel de inicio de cada rol: a donde va tras el login o si entra a un panel
// que no le corresponde.
export function homePathForRole(role: AppRole): '/admin' | '/profesional' {
  return isAdminRole(role) ? '/admin' : '/profesional';
}
