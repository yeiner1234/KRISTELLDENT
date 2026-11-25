# Spec: nuevo diseño del login (aprobado)

Reemplazar el diseño de src/pages/auth/LoginPage.tsx para que se vea exactamente como
src/assets/images/login-fondo.jpg (1774 × 887 px), sin cambiar la lógica de autenticación ni las rutas.
Solo se mantienen las funciones que ya tiene el login actual: nada de selector de sede.

## Escritorio (768 px o más)
- La imagen ES el diseño (foto, logo izquierdo, "Sistema Interno de la Clínica", frase, ondas, dientes).
  No se vuelven a dibujar.
- Contenedor con aspect-ratio 1774 / 887, ancho = min(100vw, 100vh × 2), centrado; la imagen a 100 %.
- El espacio sobrante se rellena con la misma imagen en object-cover, con blur fuerte, detrás.
- Tarjeta real encima de la dibujada: left 63.81 %, top 10.37 %, width 30.10 %, height 83.31 %
  (x 1132–1666, y 92–831). Fondo blanco, mismas esquinas y sombra, sin bordes dobles.
- Todo dentro de la tarjeta escala con el ancho del contenedor (cqw).

## Contenido de la tarjeta
- Logo circular (imagenes/kristelldent-logo.png) arriba al centro.
- "Iniciar sesión" en negrita, turquesa oscuro; "Accede con tus credenciales de trabajador."
- Sobre + "Correo electrónico", placeholder "nombre@kristelldent.com", fondo celeste claro, borde celeste.
- Candado + "Contraseña", con ojo para mostrar u ocultar.
- Fila "Recordarme" / "¿Olvidaste tu contraseña?" (enlace a /login/recuperar).
- Botón ancho completo "Iniciar sesión" con ícono de entrar, degradado turquesa, texto blanco.
- Nada debajo del botón. Fuente Poppins solo en esta pantalla. Íconos lucide: Mail, Lock, Eye/EyeOff, LogIn.
- Colores tomados con cuentagotas de la imagen.

## Celular (menos de 768 px)
- Fondo: la imagen en object-cover, desenfocada, con capa blanca semitransparente.
- Logo y "Sistema Interno de la Clínica" arriba; tarjeta a casi todo el ancho; debajo del botón, en
  pequeño, "Tu trabajo hace sonreír a más personas".
- Sin scroll horizontal a 360 px; campos y botón de al menos 44 px.

## Funcionalidad
- Se mantienen el login, los mensajes de error (dentro de la tarjeta) y la redirección por rol.
- "Recordarme": marcada → sesión en localStorage; desmarcada → sessionStorage. En el cliente de
  Supabase, sin romper la recuperación de contraseña. Se recuerda la elección.

## Accesibilidad
- Imagen de fondo con alt vacío; etiquetas asociadas a los campos; aria-label en el ojo.

## Pruebas (RTL)
- Campos visibles, el ojo alterna el tipo, el enlace apunta a /login/recuperar, "Recordarme" guarda su
  estado, el envío llama al login con correo y contraseña.

## Verificación
- npm test, npm run build, npm run lint. Commits por parte.
- 1366 × 768, 1920 × 1080 y 360 px: la tarjeta real tapa exactamente la dibujada.
- Pruebas manuales, incluida "Recordarme" (cerrar y abrir el navegador).
