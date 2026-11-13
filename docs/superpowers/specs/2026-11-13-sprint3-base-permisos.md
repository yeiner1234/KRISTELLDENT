# Sprint 3 · Base de datos y permisos

Diseño aprobado por el usuario (prompt del Sprint 3). Rama: `sprint3/base-permisos`.

## Alcance

### Migración A — `20261113100000_sprint3_estado_en_sala.sql`
Va sola: Postgres no deja usar un valor de enum en la misma transacción en que se crea.
- `alter type public.appointment_status add value if not exists 'in_room' after 'confirmed';`

### Migración B — `20261113100100_sprint3_base_permisos.sql`
1. **Código de cita (HU10/HU11).** `public.generate_appointment_code()` (plpgsql, volatile, `search_path = ''`): `'KD-'` + 6 caracteres al azar de `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`, repite si ya existe. Columna `appointments.appointment_code` rellenada para las citas existentes, con default, `not null` y `unique` (`appointments_code_unique`).
2. **Sin cruces por paciente (HU10 CL2).** Restricción de exclusión `appointments_no_patient_overlap` (patient_id, tsrange) sobre citas no canceladas. El comentario de la migración incluye la consulta previa que detecta cruces.
3. **Reglas de estado (HU11 CL1, HU12).** Trigger BEFORE UPDATE `guard_appointment_changes()` (errcode `P0001`, mensaje en español):
   - una cita `completed` o `cancelled` no se modifica más;
   - transiciones válidas: pending→confirmed|in_room|cancelled, confirmed→in_room|cancelled, in_room→completed|cancelled;
   - fecha, horas, profesional o sede solo cambian si la cita está en pending o confirmed.
4. **Nombres públicos de profesionales (C1).** `get_public_professionals()` security definer, ejecutable por anon y authenticated.
5. **Citas por rol (S1).** `appointments_select_branch_staff` (admin_sede y tecnica, su sede), `appointments_update_staff` (admin_global, admin_sede/tecnica de la sede o la profesional dueña), `appointments_insert_admin` (admin_global o admin_sede de la sede).
6. **Escrituras de catálogo y horarios solo para admins (S2).** Se reemplazan 16 políticas (detalle en el plan).
7. **Motor de disponibilidad (C6, HU09).** `get_available_slots` con un quinto parámetro `p_exclude_appointment_id uuid default null`, "hoy" en hora de Lima, vacío si el profesional está inactivo, no atiende en la sede o no ofrece el servicio; ignora la cita excluida y no ofrece horas pasadas.

### Frontend
- `professionalService.getProfessionals()`: nombres por `rpc('get_public_professionals')`, unidos por id.
- `replaceRelations()`: diferencia en vez de borrar todo; un admin_sede no toca sedes ajenas.
- `AppointmentStatus` agrega `'in_room'`; `Appointment.code` mapeado desde `appointment_code`. Etiqueta "En sala" en `utils/format.ts`, badges y colores del dashboard.
- `getTodayIsoDate()` en America/Lima.
- `teamService.setProfileActive()`: replica `active` en `professionals` si el rol es profesional.

## Decisiones tomadas al implementar
- `generate_appointment_code()` es **security definer**: como función de invocador, RLS le ocultaría citas al comprobar la unicidad. Ejecutable solo por `authenticated` y `service_role` (los únicos que insertan citas). La restricción `unique` es la garantía final.
- `replaceRelations()` **borra antes de insertar**: el trigger `enforce_specialist_single_specialty` (AFTER INSERT) fallaría si se inserta la especialidad nueva antes de quitar la anterior.
- Las sedes administrables las averigua el propio servicio (rol en `profiles` y sedes en `user_branch_access` del usuario actual) para no modificar `ProfessionalsPage`, que no está en el alcance.
- `getProfessionals()` omite a los profesionales sin nombre público (perfil inactivo); `role` queda `null` en lecturas públicas, como ya documenta el tipo.
- La Edge Function `lookup-appointments-by-dni` devuelve también `appointment_code`, para que `Appointment.code` llegue en "mis citas".
- `getAvailableSlots()` acepta `excludeAppointmentId` opcional (solo el servicio; las pantallas no cambian).
- Migración idempotente: `add column if not exists`, `drop constraint/policy/trigger/function if exists` antes de crear.

## Fuera de alcance
Páginas no mencionadas (reprogramación con el parámetro de exclusión, mostrar `code` en pantallas, `ConfirmBookingPage` sigue usando `formatAppointmentCode`).
