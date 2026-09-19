import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import type { AppRole } from '../types/User';

interface RoleRouteProps {
  allowedRoles: AppRole[];
}

// ProtectedRoute (padre en el árbol de rutas) ya garantiza que exista sesión;
// aquí solo se decide si el rol del perfil autenticado puede entrar a esta rama.
function RoleRoute({ allowedRoles }: RoleRouteProps) {
  const { user } = useAuth();

  const hasAccess = user !== null && allowedRoles.includes(user.role);

  if (!hasAccess) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

export default RoleRoute;
