# Plan: nuevo diseño del login

Rama feat/login-nuevo, creada desde feat/responsive-movil (main va ~40 commits detrás y no tiene el ojo
de la contraseña ni los 44 px en celular). El trabajo sin commit de Equipo/Home quedó en
`git stash` ("wip responsive-movil: equipo y home ...").

Medidas tomadas de la imagen (px de la imagen; en CSS, `--px = 100cqw / 1774`):
tarjeta x 1132–1665, y 92–830, radio ≈ 36; logo ≈ 222 de diámetro; título ≈ 40 px;
subtítulo y etiquetas ≈ 19 px; campos 53 de alto con 40 de margen lateral; botón y 697–752.

1. utils/authStorage (TDD): preferencia "Recordarme" (kd_remember_me, por defecto sí) y adaptador
   de almacenamiento para Supabase: con la preferencia en sí, localStorage; si no, sessionStorage.
   El code-verifier de PKCE siempre en localStorage (el enlace del correo se abre en otra pestaña).
2. lib/supabase: createClient con `auth.storage = authStorage`.
3. Asset login-fondo.jpg + styles/login.css (contenedor con aspect-ratio, cqw, fondo desenfocado,
   tarjeta, versión celular).
4. LoginPage: nuevo marcado, misma lógica (useAuth.login, homePathForRole, error/sessionError),
   Poppins cargada solo aquí. Error en el hueco debajo del botón (role="alert").
5. LoginPage.test.tsx (RTL): campos, ojo, enlace, Recordarme, envío.

Verificación manual: capturas a 1366 × 768, 1920 × 1080 y 360 px comparadas con la imagen;
"Recordarme" desmarcado → cerrar el navegador → pide login; marcado → sigue la sesión;
recuperar contraseña con "Recordarme" desmarcado sigue funcionando.
