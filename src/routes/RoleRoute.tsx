import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import type { AppRole } from '../types/User';
import { homePathForRole } from '../utils/roleHome';

interface RoleRouteProps {
  allowedRoles: AppRole[];
}

// ProtectedRoute (padre en el árbol de rutas) ya garantiza que exista sesión;
// aquí solo se decide si el rol del perfil autenticado puede entrar a esta rama.
// Si no puede, vuelve a su propio panel (no al login: ya tiene sesión).
function RoleRoute({ allowedRoles }: RoleRouteProps) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to={homePathForRole(user.role)} replace />;
  }

  return <Outlet />;
}

export default RoleRoute;
