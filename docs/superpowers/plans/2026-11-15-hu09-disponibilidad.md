# HU09 Consulta de disponibilidad — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (CLAUDE.md: misma sesión). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que el admin pueda cargar horarios y excepciones de cada profesional (y cierres de sede) para que `get_available_slots` devuelva horarios, y que la reserva pública filtre por sede, recomiende especialidades reales y muestre el calendario con días cerrados deshabilitados y errores recuperables.

**Architecture:** La lógica nueva va en funciones puras (`src/utils`) probadas con TDD; los servicios (`src/services`) validan antes de escribir y son el único punto de contacto con Supabase; las pantallas solo componen. El cálculo de horarios sigue en la RPC, que no se toca.

**Tech Stack:** React 19 + TS, Vitest + RTL, Supabase (Postgres/RLS).

**Spec:** [../specs/2026-11-15-hu09-disponibilidad.md](../specs/2026-11-15-hu09-disponibilidad.md)

## Global Constraints
- Textos de UI en español; reutilizar `src/components/common` (Modal, Button, Select, Input, EmptyState, Spinner).
- `day_of_week`: 0 = domingo … 6 = sábado. "Hoy" siempre con `getTodayIsoDate()` (America/Lima).
- Supabase se mockea con `vi.mock('../lib/supabase')` + `src/test/mockQuery.ts`.
- Nunca editar migraciones existentes; la nueva debe poder correrse dos veces.
- Errores de Supabase → mensaje claro; nunca ruedita infinita.
- Un commit por tarea, en español con prefijo; antes de cada commit `npm test`, `npm run build`, `npm run lint`.

## Review Focus
1. Horario con un rango inválido (fin ≤ inicio o cruce): `setProfessionalSchedule` no debe borrar nada → prueba "no borra si los rangos son inválidos" (Task 1).
2. Inserción que falla después del borrado: el horario anterior se restaura → prueba "restaura el horario anterior si el insert falla" (Task 1).
3. Rangos que se tocan (09:00–13:00 y 13:00–17:00) no cuentan como cruce → prueba en `scheduleValidation.test.ts` (Task 1).
4. Excepción con rango parcial donde fin ≤ inicio, o solo una de las dos horas → rechazada antes del insert (Task 2).
5. "Cualquier profesional" en una sede donde nadie de la especialidad atiende → lista vacía, mensaje vacío, nunca horarios de otra sede (Task 4).

---

### Task 1: Horario semanal del profesional

**Files:**
- Create: `src/utils/scheduleValidation.ts`, `src/utils/scheduleValidation.test.ts`, `src/services/professionalScheduleService.test.ts`
- Modify: `src/services/professionalScheduleService.ts`, `src/pages/admin/ProfessionalsPage.tsx`, `src/test/mockQuery.ts` (añadir `gte`, `is` a la cadena)

**Interfaces (Produces):**
- `interface TimeRange { start: string; end: string }` (HH:MM)
- `validateDayRanges(ranges: TimeRange[]): string | null` — `'La hora de fin debe ser posterior a la de inicio.'` o `'Los rangos se cruzan.'`; tocarse no es cruce.
- `validateWeeklySchedule(entries: ProfessionalScheduleEntry[]): string | null` — agrupa por día; el error lleva el nombre del día: `` `${DAY_LABELS[d]}: ${error}` ``.
- `rangesOutsideBranchHours(entries, branchSchedule: BranchScheduleEntry[]): number[]` — días (0–6) con algún rango fuera del horario de la sede o con la sede cerrada.
- `export const DAY_LABELS` (Domingo…Sábado) en `scheduleValidation.ts`.
- `setProfessionalSchedule` lanza `Error(validateWeeklySchedule(...))` sin tocar la base si hay error; si el insert falla, reinserta las filas leídas antes del borrado y lanza el error original.

- [ ] Pruebas puras: fin ≤ inicio → error; 09:00–13:00 + 12:00–14:00 → cruce; 09:00–13:00 + 13:00–17:00 → null; día con error en lunes → mensaje empieza con "Lunes:"; `rangesOutsideBranchHours` con sede lunes 08:00–14:00 y rango 07:00–10:00 → `[1]`, rango martes con sede cerrada martes → incluye 2.
- [ ] Pruebas del servicio: inválido → `supabase.from` nunca recibe `delete`; feliz → delete por profesional+sede e insert con filas; insert falla → segundo insert con las filas previas y rechaza con el mensaje del primer error.
- [ ] Correr, ver fallar; implementar; ver pasar.
- [ ] UI: en el modal, pestañas "Horario semanal" / "Ausencias y turnos extra" (la segunda se llena en Task 2). Cargar `getBranchScheduleForAdmin(branchId)` al cambiar de sede; mostrar el horario de la sede y un aviso ámbar bajo cada día de `rangesOutsideBranchHours` ("Fuera del horario de la sede: esas horas no se ofrecerán."). Al guardar, mostrar `validateWeeklySchedule` antes de llamar al servicio. El select de sede usa solo sedes asignadas.
- [ ] Verificar y commit `feat: horario semanal del profesional con validación antes de reemplazar`.

### Task 2: Excepciones (ausencias, turnos extra, feriados)

**Files:**
- Create: `src/services/scheduleExceptionService.ts`, `src/services/scheduleExceptionService.test.ts`
- Modify: `src/pages/admin/ProfessionalsPage.tsx`, `src/pages/admin/BranchesPage.tsx`

**Interfaces (Produces):**
- `interface ScheduleException { id; professionalId: string|null; branchId: string|null; date: string; isAvailable: boolean; startTime: string|null; endTime: string|null; reason: string|null }`
- `interface ScheduleExceptionInput` = sin `id`.
- `validateExceptionInput(input): string | null` — fecha obligatoria; fecha < hoy (Lima) → `'La fecha ya pasó.'`; horas: ambas o ninguna; fin > inicio; turno extra exige rango (`'Un turno extra necesita hora de inicio y fin.'`).
- `getUpcomingProfessionalExceptions(professionalId): Promise<ScheduleException[]>` — `.eq('professional_id')`, `.gte('exception_date', hoy)`, orden por fecha y hora.
- `getUpcomingBranchClosures(branchId)` — `.eq('branch_id')`, `.is('professional_id', null)`, `.gte(...)`.
- `createScheduleException(input)` — valida y lanza antes del insert. `deleteScheduleException(id)`.
- Las excepciones del profesional se guardan con `branch_id` null: la RPC las aplica en todas sus sedes (aviso en la UI).

- [ ] Pruebas: valida cada regla; `getUpcoming...` usa `gte` con `getTodayIsoDate()` y mapea `HH:MM`; `create` con datos inválidos no llama a `from`; error de Supabase se propaga.
- [ ] Implementar; pasar.
- [ ] UI profesional: pestaña con lista (fecha larga, "Todo el día" o rango, tipo con badge, motivo, botón borrar) y formulario. UI sede: botón "Feriados y cierres" en cada tarjeta → modal con lista + fecha + motivo.
- [ ] Commit `feat: ausencias, turnos extra y feriados por sede`.

### Task 3: Privacidad de schedule_exceptions

**Files:** Create `supabase/migrations/20261115000000_hu09_schedule_exceptions_privadas.sql`

- [ ] `grep -rn "schedule_exceptions" src supabase/functions` — solo debe aparecer el servicio admin y comentarios.
- [ ] Migración: `drop policy if exists schedule_exceptions_select_public on public.schedule_exceptions;` y `revoke select on public.schedule_exceptions from anon;`.
- [ ] Comprobación manual (SQL Editor): `select policyname from pg_policies where tablename = 'schedule_exceptions';` no lista `_select_public`; `set role anon; select count(*) from public.schedule_exceptions;` → error de permiso; `reset role;` `select * from get_available_slots(...)` sigue restando la excepción.
- [ ] Commit `fix(db): el público ya no lee los motivos de las excepciones`.

### Task 4: Reserva filtrada por sede (C4)

**Files:** Create `src/utils/bookingCandidates.ts` + test. Modify `ProfessionalStep.tsx`, `ServiceStep.tsx`, `DateTimeStep.tsx`, `BookingPage.tsx`.

**Interfaces:** `professionalsForBooking(professionals: Professional[], specialtyId: string, branchId: string): Professional[]` y `candidateProfessionals(professionals, { specialtyId, branchId, professionalId }): Professional[]` (con `ANY_PROFESSIONAL` = `'any'` devuelve los de la sede+especialidad; con un id, ese profesional solo si cumple ambos).

- [ ] Pruebas: sede A excluye doctora solo en B; especialidad distinta excluida; id concreto de otra sede → `[]`.
- [ ] Implementar; usar en los tres pasos; `BookingPage` pasa `branchId` a `ProfessionalStep` y `ServiceStep` (render condicionado a `branchId`).
- [ ] Commit `fix: la reserva solo ofrece profesionales de la sede elegida`.

### Task 5: Recomendación por motivo (C3)

**Files:** Create `src/utils/specialtyMatch.ts` + test. Modify `attentionMotives.ts`, `AttentionStep.tsx`.

**Interfaces:** `normalizeText(s): string` (minúsculas, sin tildes, trim); `findSpecialtyByNames<T extends { name: string }>(specialties: T[], names: string[]): T | null` — por cada nombre en orden: primero igualdad normalizada, luego "contiene"; el primero que encuentre gana. `AttentionMotive.recommendedSpecialtyNames: string[]`.
- Mapa: pain → Endodoncia, Odontología General; gums → Periodoncia, Odontología General; appearance → Odontología General; alignment → Ortodoncia, Odontología General; child → Odontopediatría, Odontología General; cleaning → Odontología General; urgent → Endodoncia, Cirugía Dental, Odontología General; unsure → Odontología General.

- [ ] Pruebas: "odontologia general" encuentra "Odontología General"; "Ortodoncia" ausente cae a General; igualdad gana sobre "PRUEBA Odontologia General"; sin coincidencias → null; prueba que recorre `attentionMotives` contra las 5 especialidades del script y exige que todos resuelvan.
- [ ] Commit `fix: la recomendación por motivo busca especialidades por nombre`.

### Task 6: Calendario y errores en DateTimeStep

**Files:** Modify `src/utils/businessHours.ts` (+ test), `CalendarPicker.tsx`, `DateTimeStep.tsx`. Create `src/components/booking/DateTimeStep.test.tsx`.

**Interfaces:** `isBranchClosedOn(isoDate: string, hours: WeeklyHours): boolean`. `CalendarPicker` acepta `isDateDisabled?: (iso: string) => boolean`; `toIsoDate` usa la fecha local, no `toISOString`.

- [ ] Pruebas: `isBranchClosedOn('2026-11-16', { mon: {...} })` → false; `'2026-11-15'` (domingo) sin `sun` → true.
- [ ] RTL: con `getAvailableSlots` rechazando → aparece "No se pudieron cargar los horarios. Intenta de nuevo."; clic en "Reintentar" con el mock resolviendo → aparece "09:00"; con lista vacía → "No hay horarios disponibles"; el domingo cerrado queda deshabilitado.
- [ ] `DateTimeStep` carga `getBranchWeeklyHours(branchId)` (si falla, no deshabilita nada) y agrega `.catch` + `retryCount` en las dependencias del efecto.
- [ ] Commit `feat: calendario sin días cerrados y reintento si fallan los horarios`.

### Cierre
- [ ] `npm test`, `npm run build`, `npm run lint` con salida mostrada.
- [ ] requesting-code-review contra criterios y casos límite.
- [ ] finishing-a-development-branch: mantener la rama.
