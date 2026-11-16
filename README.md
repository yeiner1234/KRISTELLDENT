# KRISTELLDENT — Sistema de citas odontológicas

Sistema de gestión de citas de la clínica Kristell Dent (proyecto SGCO-2026, 4 sedes).

- **Pacientes:** reservan sin crear cuenta, con su DNI y sus datos. Cada cita tiene un código (`KD-XXXXXX`); con el DNI y ese código consultan, reprograman o cancelan su cita.
- **Personal de la clínica:** entra con correo y contraseña. Administra sedes, horarios, profesionales, servicios y la agenda; marca la llegada de los pacientes y la atención.

La zona horaria del negocio es **America/Lima**: todo "hoy" se calcula en hora de Lima, en la base de datos y en el frontend.

## Stack

- **Frontend:** React 19 + TypeScript + Vite + Tailwind CSS 4 + React Router 7. Iconos con lucide-react.
- **Backend:** Supabase — Postgres con RLS, Auth y Edge Functions (Deno).
- **Pruebas:** Vitest + React Testing Library. **Lint:** oxlint.

## Variables de entorno

Crea `.env.local` en la raíz (no se sube al repositorio; `.env.example` sirve de plantilla):

```bash
VITE_SUPABASE_URL=https://<tu-proyecto>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Ambos valores están en el panel de Supabase, **Project Settings → API Keys**. Nunca pongas la clave secreta (`sb_secret_...`) en el frontend.

## Cómo correrlo

Requisitos: Node.js 20.19 o superior (o 22.12+).

```bash
npm install
npm run dev      # servidor de desarrollo en http://localhost:5173
npm test         # pruebas (Vitest)
npm run build    # comprobación de tipos + build de producción en dist/
npm run lint     # oxlint
```

## Roles y qué ve cada uno

| Rol | Entra a | Qué ve y puede hacer |
| --- | --- | --- |
| Sin sesión (paciente) | `/`, `/reservar`, `/consultar-citas`, `/mis-citas` | Ver sedes, especialidades y profesionales; reservar una cita; con DNI + código, ver sus citas y reprogramar o cancelar las pendientes o confirmadas de hoy en adelante. |
| `admin_global` | `/admin` | Todo: sedes (crear, editar, activar), equipo (crear usuarios, activar/desactivar), profesionales y sus horarios, especialidades, servicios, agenda y citas de todas las sedes (con filtro de sede). |
| `admin_sede` | `/admin` | Solo sus sedes: agenda y citas de su sede (confirmar, marcar llegada, atendida, reprogramar, cancelar, nueva cita), horario y feriados de su sede, horarios de sus profesionales. Especialidades y servicios en solo lectura; no crea ni desactiva sedes ni usuarios. |
| `especialista` y `odontologa_general` | `/profesional` | Solo sus citas: dashboard, "Mi agenda", "Mis citas" y "Mis pacientes". Puede confirmar, cancelar y marcar como atendida una cita En sala. |
| `tecnica` | `/profesional` | "Citas de hoy" de su sede, ordenadas por hora, con el botón "Marcar llegada" (la cita pasa a En sala). |

Un usuario que entra a una sección que no es de su rol vuelve a su propio panel. Una cuenta desactivada no tiene permisos.

## Supabase

### Migraciones

Están en `supabase/migrations/` y se aplican **en orden de nombre**. Todas las migraciones nuevas se pueden correr dos veces sin error.

**Camino recomendado (el que se usa hoy): SQL Editor.** El historial de migraciones del proyecto remoto solo registra las 8 migraciones de septiembre de 2026; las demás se aplicaron a mano. Abre cada archivo pendiente, pégalo en **SQL Editor** del panel y ejecútalo, uno por archivo y en orden.

**Con la CLI:**

```bash
npx supabase login
npx supabase link --project-ref <tu-project-ref>
npx supabase db push
```

> Antes de usar `db push` el historial remoto debe coincidir con los archivos: revisa `npx supabase migration list`. Si las migraciones aplicadas a mano aparecen como pendientes, márcalas con `npx supabase migration repair --status applied <versión>`; si no, `db push` intentará aplicarlas otra vez.

### Edge Functions

| Función | Para qué | Quién la llama |
| --- | --- | --- |
| `create-internal-user` | Crear cuentas del personal e invitarlas por correo. | Un admin con sesión (la función comprueba su rol). |
| `create-public-appointment` | Reservar una cita (paciente o admin). Valida datos y horario libre y devuelve el código. | Público. |
| `patient-appointments` | Ver, cancelar y reprogramar con DNI + código; reenviar los códigos al correo registrado. | Público. |

```bash
npx supabase functions deploy create-internal-user
npx supabase functions deploy create-public-appointment --no-verify-jwt
npx supabase functions deploy patient-appointments --no-verify-jwt
```

Las dos funciones públicas se despliegan con `--no-verify-jwt` porque el paciente no tiene sesión y la clave `sb_publishable_...` no es un JWT; ellas mismas validan cada pedido.

### Secretos de las funciones

```bash
npx supabase secrets set SB_SECRET_KEY=sb_secret_...          # obligatorio
npx supabase secrets set SITE_URL=https://<TU_DOMINIO>        # obligatorio, sin "/" final
npx supabase secrets set RESEND_API_KEY=re_...                # opcional: correo con el código de la cita
npx supabase secrets set EMAIL_FROM="Kristell Dent <citas@<TU_DOMINIO>>"   # opcional, junto con RESEND_API_KEY
```

- `SB_SECRET_KEY`: clave secreta del proyecto (**Project Settings → API Keys**). Las funciones escriben con ella; el público nunca tiene permisos de escritura.
- `SITE_URL`: dominio real de la app. Arma el enlace de invitación del personal y el enlace a `/consultar-citas` de los correos.
- Sin `RESEND_API_KEY` o `EMAIL_FROM` la reserva funciona igual, solo que no se envía el correo con el código.

`SUPABASE_URL` y `SUPABASE_ANON_KEY` los pone Supabase automáticamente.

### Authentication en el panel de Supabase

En **Authentication → URL Configuration**:

1. **Site URL:** `https://<TU_DOMINIO>`.
2. **Redirect URLs:** agrega `https://<TU_DOMINIO>/**` y `https://<TU_DOMINIO>/actualizar-contrasena`. Para desarrollo, también `http://localhost:5173/actualizar-contrasena`.

Los ajustes de la sección siguiente (expiración del enlace y largo de la contraseña) también se configuran a mano en **Authentication**.

## Recuperación de contraseña

Flujo: la usuaria entra a `/login/recuperar`, escribe su correo y recibe un enlace. El enlace abre `/actualizar-contrasena`, donde define una nueva contraseña (mínimo 8 caracteres) y entra a su panel.

- La página siempre muestra el mismo mensaje, esté o no registrado el correo.
- El enlace sirve una sola vez y vence a los 30 minutos (el frontend también lo comprueba con `recovery_sent_at`).
- `/actualizar-contrasena` solo muestra el formulario si se llegó desde el enlace del correo; con una sesión normal no se puede cambiar la contraseña ahí.

`supabase/config.toml` solo aplica al Supabase local (`npx supabase start`). En el proyecto alojado en supabase.com hay que configurarlo a mano en el dashboard, sección **Authentication**:

1. Expiración del enlace/OTP de email: `1800` segundos.
2. Longitud mínima de contraseña: `8`.
3. Agregar `https://<TU_DOMINIO>/actualizar-contrasena` a las Redirect URLs permitidas.

## Antes de producción

1. **Borrar los datos de prueba.** Abre `supabase/cleanup_fase10_test_data.sql`, revisa que el ID de sede del **paso 4** (`80bd120f-0dff-4d90-b10c-3b97cab6755e`, horario de prueba de la sede Bagua) siga siendo el de la sede correcta en **Table Editor → branches**, y córrelo en el **SQL Editor**. Luego borra el usuario de prueba desde **Authentication → Users**, como indica el final del script.
2. Configurar el horario real de cada sede y de cada profesional desde `/admin/sedes` y `/admin/profesionales`.
3. Revisar que todas las migraciones estén aplicadas y las tres Edge Functions desplegadas con sus secretos.
4. Configurar Site URL y Redirect URLs con el dominio real.

## Estructura

```
src/pages/{public,admin,professional,auth}   pantallas
src/components/{common,booking,appointments,dashboard,home,...}
src/services     único lugar que habla con Supabase
src/hooks        estado de carga de los datos
src/utils        lógica pura (fechas en hora de Lima, validaciones, filtros)
supabase/migrations   SQL versionado (AAAAMMDDHHMMSS_nombre.sql)
supabase/functions    Edge Functions
supabase/scripts      SQL manual (datos de prueba)
docs/                 specs, planes y guía de verificación del Sprint 3
```
