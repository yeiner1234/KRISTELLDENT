# Cierre del Sprint 3 (HU09–HU12) — spec aprobada

Diseño aprobado por el usuario (prompt de cierre del Sprint 3). Rama: `sprint3/cierre`, creada desde `main`. No se agregan funciones nuevas.

## Tareas
1. **Errores visibles.** Revisar `src/context/AuthContext.tsx`, `src/hooks/*.ts` y las páginas que hacen await sin catch. Toda carga que falle termina el estado de carga y muestra un mensaje; toda acción que falle (confirmar, cancelar, guardar) muestra el error.
2. **Limpieza.** Borrar `src/services/api.ts` (no se usa), `src/data/branches.ts` (marcado como no usado; confirmar con grep) y `scratch-noverify.mjs`. Sin imports rotos.
3. **README.md** del proyecto: qué es, stack, variables de entorno (`.env.local` con `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY`), cómo correrlo, roles y qué ve cada uno, cómo aplicar migraciones (`npx supabase db push`) y desplegar Edge Functions (`create-internal-user`, `create-public-appointment`, `patient-appointments`), secretos (`SB_SECRET_KEY`, `SITE_URL`) y configuración de Authentication (Site URL y Redirect URLs del dominio real, incluida `/actualizar-contrasena`). Conservar la sección de recuperación de contraseña.
4. **`docs/sprint3-verificacion.md`:** tabla por HU (HU09, HU10, HU11, HU12) con cada criterio y caso límite, paso exacto en la app, resultado esperado y columna "Resultado" vacía. Sección de pruebas por rol: sin sesión, especialista, técnica, admin de sede y admin global.
4b. **Pendientes de HU09:**
   - Selectores "Sede" (modal Horario) y "Sede del turno extra": solo sedes activas, abren en la primera activa.
   - Errores de permisos de los servicios de horario y excepciones: "No tienes permiso para modificar esta sede." en vez del texto de Supabase.
   - Modal Horario: el error de validación se lleva a la vista al aparecer y se borra al editar cualquier bloque.
   - Reserva con "Cualquier profesional" en una sede sin profesionales de la especialidad: "No hay profesionales de esta especialidad en esta sede."
   - Confirmación antes de borrar una excepción o un feriado.
   - `specialtyIcons.ts` busca el icono por nombre de especialidad (como `specialtyMatch.ts`), no por IDs fijos `sp-*`.
5. **Datos de prueba:** no se borran. README, sección "Antes de producción": correr `supabase/cleanup_fase10_test_data.sql` en el SQL Editor y revisar que el ID de sede del paso 4 siga siendo el correcto.

## Verificación
- `npm test`, `npm run build` y `npm run lint` sin errores.
- Recorrer el código de cada criterio de `docs/sprint3-verificacion.md` y anotar lo que no esté implementado.
- Commits separados. Resumen final por HU, pendientes y lista ordenada de migraciones y funciones.

## Decisiones tomadas al planificar
- Al revisar `main`, cinco de los seis pendientes de 4b ya están hechos (sedes activas con `activeBranchesOf`, `friendlyWriteError` en los servicios, `FormError` con scroll y borrado al editar, mensaje de `ServiceStep` con prueba, confirmación "¿Borrar?" en `ScheduleExceptionsPanel`). Solo se agrega: `friendlyWriteError` también traduce "permission denied" (error 42501 de Postgres, que no es de RLS) y los iconos por nombre.
- Migraciones en el README: el usuario aplica cada archivo en el SQL Editor (el historial remoto solo registra las 8 de septiembre, así que `db push` intentaría reaplicar todo). El README explica `npx supabase db push` como pide el prompt, pero advierte esto y deja el SQL Editor como camino recomendado.
- Secretos: además de `SB_SECRET_KEY` y `SITE_URL`, el README lista `RESEND_API_KEY` y `EMAIL_FROM` (opcionales, correo del código de HU11).
- `AuthContext`: si no se puede comprobar la sesión, termina la carga sin usuario y expone `sessionError`, que `LoginPage` muestra. `logout` limpia el usuario aunque `signOut` falle (la sesión local se borra igual).
- Footer y Hero usan sedes/profesionales solo como decoración: si fallan no muestran nada; el mensaje lo dan ContactSection y ProfessionalsSection de la misma página.
