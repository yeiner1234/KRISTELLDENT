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
| `admin_global` | `/admin` | Todo: sedes (crear, editar, activar), equipo (crear usuarios, activar/desactivar, sedes de técnicas y administradoras), profesionales y sus horarios, especialidades (agregar, renombrar, desactivar, borrar), servicios de cualquier sede, "Oferta por sede", agenda y citas de todas las sedes. No se crea otra admin_global desde la app (ver "Crear una administradora global"). |
| `admin_sede` | `/admin` | Solo sus sedes: sus servicios (crear, editar, activar, con su precio y duración), agrega especialidades a la lista compartida, suma a su sede profesionales que ya atienden en otra, decide qué atiende cada una en su sede, horarios, ausencias y feriados de su sede, sedes de sus técnicas, agenda y citas de su sede. Ve en solo lectura lo de otras sedes; no renombra ni desactiva especialidades, no cambia la especialidad de una especialista y no desactiva fichas completas. |
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

### Crear una administradora global

La app nunca crea cuentas `admin_global` (la pantalla no lo ofrece y `create-internal-user` responde 403). Para crear una:

1. **Authentication → Users → Add user → Send invitation** (o **Create new user**) con su correo. Copia el **User UID** que aparece en la lista.
2. En **SQL Editor**, con ese UID, su nombre y su correo:

```sql
insert into public.profiles (id, full_name, email, role, active)
values ('<USER_UID>', 'Nombre Apellido', 'correo@dominio.com', 'admin_global', true)
on conflict (id) do update
set role = 'admin_global', active = true, full_name = excluded.full_name;
```

3. Comprueba: `select id, full_name, role, active from public.profiles where role = 'admin_global';`

Para quitarle el rol a una admin_global hay que dejar otra activa: la base no deja desactivar ni cambiar el rol de la última (trigger `protect_admin_global`), y nadie puede desactivar su propia cuenta.

### Edge Functions

| Función | Para qué | Quién la llama |
| --- | --- | --- |
| `create-internal-user` | Crear cuentas del personal e invitarlas por correo. A especialistas y odontólogas generales les crea también su ficha y sus sedes. Nunca crea `admin_global`. | Un admin con sesión (la función comprueba su rol). |
| `create-public-appointment` | Reservar una cita (paciente o admin). Valida datos y horario libre y devuelve el código. | Público. |
| `patient-appointments` | Ver, cancelar y reprogramar con DNI + código; reenviar los códigos al correo registrado. Bloquea 5 minutos un DNI tras 3 códigos incorrectos. | Público. |
| `appointment-emails` | Correos de cita reprogramada o cancelada (venga del paciente o del panel) y recordatorios 24 horas antes. | La base: el trigger `enqueue_appointment_email` (pg_net) y pg_cron cada 10 minutos, con el secreto `x-cron-secret`. |

```bash
npx supabase functions deploy create-internal-user
npx supabase functions deploy create-public-appointment --no-verify-jwt
npx supabase functions deploy patient-appointments --no-verify-jwt
npx supabase functions deploy appointment-emails --no-verify-jwt
```

Las dos funciones públicas se despliegan con `--no-verify-jwt` porque el paciente no tiene sesión y la clave `sb_publishable_...` no es un JWT; ellas mismas validan cada pedido. `appointment-emails` también, porque la llama la base con su propio secreto (`APPOINTMENT_EMAILS_SECRET`), no con un JWT.

#### Correos automáticos (avisos y recordatorios)

Después de aplicar la migración `20261125000000_hu13_hu14_correos_citas.sql`, una vez, en el SQL Editor (el mismo secreto en los dos lados):

```sql
select vault.create_secret('https://<ref>.supabase.co/functions/v1/appointment-emails', 'appointment_emails_url');
select vault.create_secret('<secreto largo al azar>', 'appointment_emails_secret');
```

```bash
npx supabase secrets set APPOINTMENT_EMAILS_SECRET=<secreto largo al azar>
```

Sin esos secretos las citas se guardan igual; los avisos esperan en `appointment_email_outbox` y no salen recordatorios.

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
