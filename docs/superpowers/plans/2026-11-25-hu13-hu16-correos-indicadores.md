# Plan HU13–HU16 (spec: docs/superpowers/specs/2026-11-25-hu13-hu16-correos-indicadores.md)

Rama `sprint3/hu13-hu16`. TDD en src/utils, src/services, src/hooks y en la lógica pura de las Edge Functions.

## Arquitectura de correos (HU13 + HU14)
- Un trigger AFTER UPDATE en `appointments` deja una fila en `appointment_email_outbox` cuando la cita se reprograma (cambia fecha u hora) o se cancela. Así el correo sale venga el cambio del paciente (Edge Function) o del personal (panel, RPC).
- El mismo trigger llama sin esperar (`pg_net`) a la Edge Function nueva `appointment-emails`. pg_cron la llama además cada 10 minutos: reintenta los correos pendientes y envía los recordatorios.
- Recordatorios: columnas `scheduled_at` (cuándo se reservó o reprogramó por última vez) y `reminder_sent_at`. Al reprogramar se reinician las dos.
- La URL de la función y su secreto están en Supabase Vault (`appointment_emails_url`, `appointment_emails_secret`). Sin ellos no se llama a nada y la cita se guarda igual.

## Tareas
1. Plantillas `rescheduledEmail`, `cancelledEmail`, `reminderEmail` en `_shared/emailTemplates.ts` (TDD).
2. Lógica pura `appointment-emails/appointmentEmails.ts`: `limaStartInstant`, `isReminderDue`, `isAuthorized` (TDD).
3. Edge Function `appointment-emails/index.ts`: procesa la bandeja y los recordatorios.
4. Migración `20261125000000_hu13_hu14_correos_citas.sql`.
5. HU15: lógica pura `accessLockState` en patientAppointments.ts (TDD) + tabla `patient_access_failures` (migración `20261125000100_hu15_bloqueo_intentos.sql`) + uso en patient-appointments/index.ts.
6. HU16: RPC `appointment_indicators` (migración `20261125000200_hu16_indicadores.sql`), `utils/appointmentIndicators.ts` (TDD), `services/indicatorService.ts` (TDD), `hooks/useAppointmentIndicators.ts` (TDD), página `/admin/indicadores` con prueba RTL, enlace en el menú.

## Comprobaciones manuales (SQL sin pruebas automáticas)
- HU13: `update appointments set status='cancelled' where id='<id de prueba>';` → `select kind, sent_at, last_error from appointment_email_outbox order by created_at desc limit 1;` muestra `cancelled` y, segundos después, `sent_at` lleno. Reprogramar desde el panel deja `rescheduled`.
- HU13: cambiar solo `status` a confirmed no deja fila en la bandeja.
- HU14: cita de prueba para mañana a esta hora + 5 min, con `scheduled_at` de hace 2 días → en ≤10 min `reminder_sent_at` queda lleno. Con `scheduled_at = now()` no se envía. Cancelada no se envía.
- HU14: `select jobname, schedule from cron.job where jobname='appointment-emails';` → `*/10 * * * *`.
- HU15: 3 códigos incorrectos seguidos para un DNI → el 3.º ya responde "Demasiados intentos…"; con el código correcto también responde bloqueado hasta pasar 5 min. Igual con un DNI no registrado.
- HU16 (caso límite 1): como admin_sede, `select * from appointment_indicators('2026-11-01','2026-11-30', null, '<id de otra sede>');` devuelve 0 filas. Como admin_global devuelve las de esa sede.
- Las migraciones se pueden correr dos veces sin error.
