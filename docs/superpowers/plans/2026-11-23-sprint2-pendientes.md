# Pendientes del Sprint 2 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (CLAUDE.md: ejecución en esta misma sesión). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cerrar los criterios pendientes de las HU de sedes, especialidades/servicios, profesionales y horarios del Sprint 2.

**Architecture:** Cada regla vive en tres capas cuando aplica: pantalla (mensaje inmediato), servicio (no escribe datos inválidos) y base (trigger o restricción, la última palabra). Los mensajes de los triggers llegan tal cual en `error.message` y las pantallas ya los muestran.

**Tech Stack:** React 19 + TS + Vitest + RTL, Supabase (Postgres).

**Spec:** docs/superpowers/specs/2026-11-23-sprint2-pendientes.md

## Global Constraints
- Una sola migración nueva: `supabase/migrations/20261123000000_sprint2_pendientes.sql`, re-ejecutable (`drop ... if exists`, `create or replace`).
- TDD para `src/utils` y `src/services`. Supabase mockeado con `vi.mock` y `src/test/mockQuery.ts`.
- Antes de cada commit: `npm test`, `npm run build`, `npm run lint`. Un commit por punto, en español con prefijo.

## Comprobación manual del SQL (SQL Editor, después de aplicar)
| Regla | Consulta o paso |
|---|---|
| 1 Región | `insert into branches (name, address) values ('X','Y');` → falla con `branches_region_required`. |
| 2 Sede con citas | Con una cita `pending` de hoy o después: `update branches set active=false where id='…';` → "No se puede desactivar: la sede tiene N citas pendientes." |
| 3 Especialidad | Con un servicio activo: `update specialties set active=false where id='…';` → "Tiene N servicios activos: desactívalos primero." |
| 6 Servicio ajeno | `insert into professional_services (professional_id, service_id) values ('<prof>', '<servicio de otra especialidad>');` → rechazado. |
| 8 Dentro de la sede | Sede que abre 08:00 el lunes: insertar horario lunes 07:00–12:00 → "El horario del profesional debe estar dentro del horario de la sede." |
| 9 Sin cruces | Lunes 09:00–13:00 en una sede y 12:00–16:00 en otra para la misma profesional → `professional_schedules_no_overlap`. |

---

### Task 1: Región obligatoria
**Files:** `BranchesPage.tsx`, migración (sección 1).
- [ ] Input "Región / ciudad" con `required`; `handleSubmit` rechaza región vacía ("Ingresa la región o ciudad de la sede.").
- [ ] SQL: `branches_region_required` NOT VALID + consulta de sedes sin región en comentario.
- [ ] Commit `feat: región obligatoria en las sedes`.

### Task 2: Sede con citas pendientes
**Files:** migración (sección 2). La pantalla ya muestra `err.message` en `toggleError`.
- [ ] Función `prevent_branch_deactivation_with_appointments()` + trigger `before update of active ... when (old.active and not new.active)`.
- [ ] Commit `feat: no se desactiva una sede con citas pendientes`.

### Task 3: Especialidad con servicios activos
**Files:** migración (sección 3).
- [ ] Función `prevent_specialty_deactivation_with_services()` + trigger.
- [ ] Commit `feat: no se desactiva una especialidad con servicios activos`.

### Task 4: Servicios agrupados por especialidad
**Files:** `src/utils/serviceGroups.ts(+test)`, `ServicesPage.tsx`.
- [ ] Test: `groupServicesBySpecialty(services, specialties)` ordena grupos por nombre de especialidad, omite grupos vacíos, junta los de especialidad desconocida en "Sin especialidad" al final.
- [ ] Ver fallar, implementar, ver pasar. Página: un encabezado por grupo y su `DataTable` (sin columna Especialidad) sobre la lista ya filtrada.
- [ ] Commit `feat: servicios agrupados por especialidad`.

### Task 5: Al menos una sede y una especialidad
**Files:** `professionalService.ts(+test)`, `ProfessionalsPage.tsx`.
- [ ] Test: `updateProfessional`/`createProfessional` con `branchIds: []` → "Elige al menos una sede." sin llamar a Supabase; con `specialtyIds: []` → "Elige una especialidad.".
- [ ] Ver fallar, implementar `validateRelations`, ver pasar. Formulario: sede activa obligatoria y, para especialista, una especialidad.
- [ ] Commit `feat: el profesional exige al menos una sede y una especialidad`.

### Task 6: Servicio de una especialidad que no tiene
**Files:** `professionalService.ts(+test)`, migración (sección 6).
- [ ] Test de orden: borrado de servicios antes que el de especialidades; alta de especialidades antes que la de servicios; todos los borrados antes que las altas.
- [ ] Ver fallar, reordenar `replaceRelations` en 4 pasos, ver pasar.
- [ ] SQL: `enforce_service_matches_specialty()` + trigger before insert or update en `professional_services`; consulta de filas actuales que no cumplen.
- [ ] Commit `feat: un profesional solo ofrece servicios de sus especialidades`.

### Task 7: Filtro por sede en Profesionales
**Files:** `ProfessionalsPage.tsx(+test)`.
- [ ] Test RTL: con dos profesionales en sedes distintas, elegir una sede deja solo a la profesional de esa sede.
- [ ] Commit `feat: filtro por sede en Profesionales`.

### Task 8: Horario dentro del de la sede
**Files:** `scheduleValidation.ts(+test)`, `professionalScheduleService.ts(+test)`, `ProfessionalsPage.tsx(+test)`, migración (sección 8).
- [ ] Test: `validateWithinBranchHours(entries, branchSchedule)` → `null` si todo cabe; "Lunes: El horario del profesional debe estar dentro del horario de la sede." si no.
- [ ] Test servicio: lee `branch_schedules` de esa sede y no borra nada si un rango queda fuera.
- [ ] Test RTL: con la sede abriendo 08:00 y un bloque 07:00–12:00, "Guardar horario" muestra el error y no llama a `setProfessionalSchedule`.
- [ ] SQL: consulta de horarios actuales fuera de su sede (comentario) + `enforce_schedule_within_branch_hours()` + trigger.
- [ ] Commit `feat: el horario del profesional debe estar dentro del de la sede`.

### Task 9: Sin cruces entre sedes
**Files:** `supabaseErrors.ts(+test)`, migración (sección 9).
- [ ] Test: `friendlyWriteError('conflicting key value violates exclusion constraint "professional_schedules_no_overlap"')` → "Ese horario se cruza con su horario en otra sede.".
- [ ] SQL: consulta de cruces actuales (comentario) + `professional_schedules_no_overlap`.
- [ ] Commit `feat: el horario de una profesional no se cruza entre sedes`.

### Task 10: Cierre
- [ ] `npm test`, `npm run build`, `npm run lint`; revisión contra criterios; lista de verificación al usuario y migración a pegar.
