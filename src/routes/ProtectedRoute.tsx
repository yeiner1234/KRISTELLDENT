import { Outlet } from 'react-router-dom';

// TODO: connect real authentication once the REST API exists.
// Replace this with `const { isAuthenticated } = useAuth();` and redirect
// unauthenticated staff (ADMIN / PROFESSIONAL) to /login with <Navigate />.
// For now, access is always allowed since there is no backend yet.
function ProtectedRoute() {
  const isAuthenticated = true;

  if (!isAuthenticated) {
    return null;
  }

  return <Outlet />;
}

export default ProtectedRoute;
