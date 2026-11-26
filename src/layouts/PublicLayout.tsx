import { Outlet, useLocation } from 'react-router-dom';

// Inicio de sesión y cambio de contraseña tienen su propio diseño: sin la
// tipografía de la web pública.
const OWN_DESIGN_PATHS = ['/login', '/actualizar-contrasena'];

function PublicLayout() {
  const { pathname } = useLocation();
  const isPublicSite = !OWN_DESIGN_PATHS.some((path) => pathname.startsWith(path));

  return isPublicSite ? (
    <div className="public-site">
      <Outlet />
    </div>
  ) : (
    <Outlet />
  );
}

export default PublicLayout;
