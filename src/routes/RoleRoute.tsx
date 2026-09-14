import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import type { UserRole } from '../types/User';

interface RoleRouteProps {
  allowedRoles: UserRole[];
}

// Prepared for ADMIN / PROFESSIONAL role checks. Since there is no backend yet,
// an anonymous visitor (user === null) is still allowed through; once a session
// exists (via useAuth) its role must match allowedRoles or it gets bounced to /login.
function RoleRoute({ allowedRoles }: RoleRouteProps) {
  const { user } = useAuth();

  const hasAccess = user === null || allowedRoles.includes(user.role);

  if (!hasAccess) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

export default RoleRoute;
