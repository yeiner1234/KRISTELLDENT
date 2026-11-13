# Sprint 3 · Base y permisos — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (elegido en CLAUDE.md) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Estado "en sala", código de cita, reglas de estado, permisos por rol y motor de disponibilidad corregido, con el frontend adaptado.

**Architecture:** Dos migraciones nuevas (A: valor de enum, sola; B: todo lo demás, idempotente). En el frontend solo cambian servicios, tipos, utilidades y badges; la lógica nueva de servicios se prueba con Supabase mockeado (`src/test/mockQuery.ts`).

**Tech Stack:** Postgres/Supabase (RLS, plpgsql), React 19 + TS, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-13-sprint3-base-permisos.md`

## Global Constraints
- No editar migraciones existentes. Cada migración nueva corre dos veces sin error.
- Nada contra producción. No hay Docker: las migraciones se revisan a mano contra los nombres de políticas existentes.
- Textos en español. Errores de Supabase con mensaje claro.
- Commits separados: migraciones / frontend. Antes de cada commit: `npm test`, `npm run build`, `npm run lint`.

## Review Focus
1. Especialista que cambia de especialidad al editar → `replaceRelations` debe borrar antes de insertar (prueba en Task 4).
2. admin_sede que edita un profesional con sedes ajenas → esas sedes no se borran ni insertan (prueba en Task 4).
3. Profesional activo cuyo perfil está inactivo → no aparece en la reserva pública (prueba en Task 3).
4. `getTodayIsoDate()` entre las 19:00 y 23:59 de Lima (ya es mañana en UTC) → devuelve el día de Lima (prueba en Task 2).
5. Desactivar un perfil sin rol profesional → no toca `professionals` (prueba en Task 5).

---

### Task 1: Migraciones A y B

**Files:**
- Create: `supabase/migrations/20261113100000_sprint3_estado_en_sala.sql`
- Create: `supabase/migrations/20261113100100_sprint3_base_permisos.sql`
- Modify: `supabase/functions/lookup-appointments-by-dni/index.ts` (select y respuesta incluyen `appointment_code` → `code`)

- [ ] **Step 1:** Escribir A con el `alter type ... add value if not exists 'in_room' after 'confirmed'`.
- [ ] **Step 2:** Escribir B en el orden de la spec (2.1 a 2.7). Idempotencia: `add column if not exists`; `drop constraint if exists` antes de cada `add constraint`; `drop trigger if exists`; `drop policy if exists` del nombre viejo y del nuevo antes de cada `create policy`; `drop function if exists public.get_available_slots(uuid, uuid, uuid, date)`.
- [ ] **Step 3:** Revisión manual: cada `drop policy` nombra una política que existe hoy (`grep -n "create policy" supabase/migrations/*.sql`), cada tabla del bloque "con branch_id" tiene la columna `branch_id`, y `btree_gist` ya está creada (migración de disponibilidad).
- [ ] **Step 4:** Commit `feat(db): estado en sala, código de cita, reglas de estado y permisos por rol`.

**Comprobaciones manuales (SQL Editor, tras aplicar):**

| Regla | Consulta o paso | Esperado |
|---|---|---|
| A | `select enum_range(null::appointment_status);` | `{pending,confirmed,in_room,completed,cancelled}` |
| 2.0 | En una transacción con `rollback`: `update profiles set active = false where id = '<admin_sede>'; set local role authenticated; set local request.jwt.claims = '{"sub":"<admin_sede>"}'; select public.current_user_role(); select count(*) from appointments; insert into branch_schedules (branch_id, day_of_week, open_time, close_time) values ('<su sede>', <día sin horario>, '09:00', '13:00');` | `null`, `0` y el insert falla por RLS. Sin el `update` (perfil activo): `admin_sede`, citas de su sede y el insert pasa |
| 2.1 | `select count(*) filter (where appointment_code is null), count(*) - count(distinct appointment_code) from appointments;` y `select appointment_code from appointments limit 5;` | `0, 0`; códigos `KD-XXXXXX` sin I, O, 0 ni 1 |
| 2.2 | Insertar para un mismo paciente dos citas solapadas con profesionales distintos | la segunda falla con `23P01` |
| 2.3 | En una transacción con `rollback`: `update appointments set status='pending'` sobre una `completed`; `pending→completed`; cambiar `appointment_date` de una `in_room` | las tres fallan con el mensaje en español (P0001); `pending→in_room` pasa |
| 2.4 | `set role anon; select * from get_public_professionals(); reset role;` | lista id y nombre de profesionales activos |
| 2.5 | Con el JWT de una especialista (o `set local role authenticated; set local request.jwt.claims = '{"sub":"<uuid>"}'`): `select count(*) from appointments where professional_id <> '<uuid>'` | `0`. Con una técnica: solo citas de sus sedes |
| 2.6 | Como técnica: `insert into branch_schedules ...` de su sede | falla por RLS. Como admin_sede de esa sede: pasa |
| 2.6 (sedes cruzadas) | Como admin_sede de la sede A: `insert into professional_branches (professional_id, branch_id) values ('<profesional solo de la sede B>', '<A>');` y lo mismo en `professional_schedules` | falla por RLS. Con un profesional que comparte sede con ese admin: pasa |
| 2.7 | `select * from get_available_slots(<prof>, <sede>, <servicio>, current_date);` | sin horas anteriores a la hora de Lima; vacío con profesional inactivo, sede que no atiende o servicio que no ofrece; con `p_exclude_appointment_id` de una cita reaparece su franja |

### Task 2: Tipos, utilidades y badges ("En sala", `code`, hoy en Lima)

**Files:**
- Modify: `src/types/Appointment.ts`, `src/utils/date.ts`, `src/utils/format.ts`, `src/components/appointments/AppointmentStatus.tsx`, `src/components/common/StatusBadge.tsx`, `src/components/dashboard/AgendaGrid.tsx`, `src/pages/professional/DashboardPage.tsx` (solo el mapa de colores), `src/styles/globals.css` (tokens `--color-adm-status-in-room-{text,bg,border,solid}`)
- Test: `src/utils/date.test.ts`, `src/utils/format.test.ts`

**Interfaces — Produces:** `AppointmentStatus = 'pending' | 'confirmed' | 'in_room' | 'completed' | 'cancelled'`; `Appointment.code: string`; tono `'adm-in-room'`.

- [ ] **Step 1:** Pruebas: `getTodayIsoDate()` con `vi.setSystemTime(new Date('2026-11-14T03:30:00Z'))` → `'2026-11-13'`, y con `'2026-11-13T15:00:00Z'` → `'2026-11-13'`; `formatAppointmentStatus('in_room')` → `'En sala'`.
- [ ] **Step 2:** Correr `npm test -- src/utils` → FAIL.
- [ ] **Step 3:** Implementar `getTodayIsoDate()` con `Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit' })`; etiqueta `in_room: 'En sala'`; tono público `brand`, admin `adm-in-room`; colores en AgendaGrid y dashboard profesional.
- [ ] **Step 4:** `npm test -- src/utils` → PASS.

### Task 3: `appointmentService` y `getProfessionals`

**Files:**
- Create: `src/test/mockQuery.ts` — `mockQuery(result)`: builder encadenable (`select, insert, update, delete, eq, in, order, single, maybeSingle`) que registra llamadas y resuelve `result` al hacer `await`.
- Modify: `src/services/appointmentService.ts`, `src/services/professionalService.ts`
- Test: `src/services/appointmentService.test.ts`, `src/services/professionalService.test.ts`

- [ ] **Step 1:** Pruebas:
  - `getAllAppointments()` pide `appointment_code` en el select y devuelve `code: 'KD-ABC234'`.
  - `getAppointmentsByPatientDni()` mapea `code` de la respuesta de la función.
  - `getAvailableSlots({ ..., excludeAppointmentId: 'a1' })` llama al RPC con `p_exclude_appointment_id: 'a1'`; sin él, con `null`.
  - `getProfessionals()` no pide `profiles` en el select, llama a `rpc('get_public_professionals')` y devuelve `fullName` unido por id; omite el profesional sin nombre público; propaga el error del RPC.
- [ ] **Step 2:** Correr → FAIL.
- [ ] **Step 3:** Implementar. `getProfessionals()` usa un select sin `profiles` (`PUBLIC_SELECT_COLUMNS`); `getAllProfessionalsForAdmin()` sin cambios.
- [ ] **Step 4:** Correr → PASS.

### Task 4: `replaceRelations` por diferencia

**Files:** Modify `src/services/professionalService.ts`; Test `src/services/professionalService.test.ts`

**Interfaces:** `replaceRelations(professionalId: string, input: ProfessionalRelationsInput): Promise<void>` (privada; se prueba por `updateProfessional`). Helper `getManageableBranchIds(): Promise<string[] | null>` — `null` = todas (admin_global).

- [ ] **Step 1:** Pruebas sobre `updateProfessional('p1', ...)` con relaciones actuales `{ specialties: [s1], branches: [b1, bAjena], services: [v1, v2] }` e input `{ specialtyIds: [s2], branchIds: [b1, b2], serviceIds: [v1] }`:
  - inserta solo `s2`, `b2`; borra solo `s1`, `v2`;
  - todos los `delete` ocurren antes que cualquier `insert` (Review Focus 1);
  - como admin_sede con sedes `[b1, b2]`, `bAjena` no se borra (Review Focus 2); como admin_global sí;
  - sin cambios no llama `insert` ni `delete`;
  - un error de Supabase se propaga como `Error` con su mensaje.
- [ ] **Step 2:** Correr → FAIL.
- [ ] **Step 3:** Implementar: leer las tres relaciones actuales, calcular altas y bajas (sedes limitadas a `getManageableBranchIds()`), ejecutar bajas (`delete().eq('professional_id').in(columna, ids)`) y luego altas.
- [ ] **Step 4:** Correr → PASS.

### Task 5: `teamService.setProfileActive` sincroniza `professionals`

**Files:** Modify `src/services/teamService.ts`; Test `src/services/teamService.test.ts`

- [ ] **Step 1:** Pruebas: perfil `odontologa_general` → actualiza `professionals.active` con el mismo valor; perfil `tecnica` → no llama `from('professionals')` (Review Focus 5); error de Supabase → `Error`.
- [ ] **Step 2:** Correr → FAIL.
- [ ] **Step 3:** Implementar: `update({ active }).eq('id', id).select('role').single()`, y si `PROFESSIONAL_ROLES.includes(role)`, `professionals.update({ active }).eq('id', id)`.
- [ ] **Step 4:** Correr → PASS.
- [ ] **Step 5:** `npm test`, `npm run build`, `npm run lint` sin errores; commit `feat: estado en sala, código de cita y servicios del sprint 3`.

### Task 6: Cierre
- [ ] verification-before-completion (salidas de las tres órdenes), requesting-code-review contra la spec, finishing-a-development-branch (mantener la rama).
