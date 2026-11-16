# Cierre del Sprint 3 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (CLAUDE.md: ejecución en esta misma sesión). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cerrar HU09–HU12: errores siempre visibles, limpieza, README, guía de verificación manual y los pendientes de HU09.

**Architecture:** Sin funciones nuevas. Los hooks ya devuelven `error`; las pantallas que lo ignoran pasan a mostrarlo con `FormError`/`EmptyState`. Las acciones sin `catch` guardan el mensaje en un estado que se muestra.

**Tech Stack:** React 19 + TS + Vitest + RTL, Supabase.

**Spec:** docs/superpowers/specs/2026-11-16-cierre-sprint3.md

## Global Constraints
- Textos en español. Reutilizar `FormError`, `EmptyState`, `Spinner`.
- Nunca una ruedita infinita: todo `isLoading` termina también en error.
- Antes de cada commit: `npm test`, `npm run build`, `npm run lint`. Commits en español con prefijo, sin Co-Authored-By.
- No tocar migraciones existentes; no se necesita ninguna migración nueva.

## Review Focus
- Sesión que no se puede comprobar (red caída al abrir /admin): debe ir al login con mensaje, no quedarse cargando → prueba en Task 2.
- Activar/desactivar en Sedes/Servicios/Especialidades/Profesionales rechazado por RLS: mensaje visible y botón liberado → revisión manual (fila en la guía).
- Reserva con catálogo caído (sedes/especialidades no cargan): mensaje en el paso, no "No hay especialidades registradas" → prueba RTL en Task 3 (BranchSelector).
- Especialidad con nombre en mayúsculas o sin tildes ("ODONTOPEDIATRIA"): mismo icono → prueba en Task 5.
- Error 42501 "permission denied for table …": mensaje de permisos → prueba en Task 5.

---

### Task 1: Limpieza
**Files:** Delete `src/services/api.ts`, `src/data/branches.ts`, `scratch-noverify.mjs`.
- [ ] grep de `apiRequest`, `legacyBranchReferenceData`, `services/api`, `data/branches`: solo aparecen en los propios archivos.
- [ ] `git rm` de los tres archivos; `npm run build` pasa.
- [ ] Commit `refactor: borra api.ts, data/branches.ts y scratch-noverify.mjs sin uso`.

### Task 2: Sesión y estado de sede sin cargas colgadas
**Files:** Modify `src/context/AuthContext.tsx`, `src/pages/auth/LoginPage.tsx`, `src/hooks/useBranchOpenStatus.ts`. Test: `src/context/AuthContext.test.tsx`, `src/hooks/useBranchOpenStatus.test.ts`.
**Interfaces:** `AuthContextValue` agrega `sessionError: string | null`.
- [ ] Test `AuthContext`: con `getCurrentUser` rechazado → `isLoading` false, `user` null, `sessionError` = `'No se pudo comprobar tu sesión. Revisa tu conexión e inténtalo de nuevo.'`; con `logout` rechazado → `user` queda null y no lanza.
- [ ] Test `useBranchOpenStatus`: con `getBranchWeeklyHours` rechazado → `{ isOpen: false, todayLabel: 'Horario no disponible' }`.
- [ ] Ver fallar; implementar (`.catch` en el efecto; `logout` con try/catch que siempre limpia; LoginPage muestra `sessionError` si no hay `error` propio); ver pasar.
- [ ] Commit `fix: la sesión y el horario de la sede terminan de cargar aunque fallen`.

### Task 3: Cargas que fallan muestran mensaje
**Files:** Modify booking (`AttentionStep`, `BranchSelector`, `ProfessionalStep`, `ServiceStep`, `DateTimeStep`), home (`ContactSection`, `ProfessionalsSection`, `SpecialtiesSection`), `ConfirmBookingPage`, admin (`AgendaPage`, `AppointmentsPage`, `DashboardPage`, `PatientsPage`, `ProfessionalsPage`, `ServicesPage`, `SpecialtiesPage`, `TeamPage`), profesional (`DashboardPage`, `MyAgendaPage`, `MyAppointmentsPage`, `TodayAppointmentsPage`). Test: `src/components/booking/BranchSelector.test.tsx`.
- [ ] Test RTL: `useBranches` mockeado con `error: 'No se pudieron cargar las sedes.'` → se muestra ese texto, no hay spinner.
- [ ] Ver fallar; en cada pantalla leer el `error` de todos sus hooks (`a ?? b ?? …`) y mostrarlo en lugar de la lista (EmptyState) o encima (FormError) cuando la lista principal sí cargó; ConfirmBooking: deshabilita Confirmar si no cargaron los servicios.
- [ ] Ver pasar; `npm test` completo.
- [ ] Commit `fix: las pantallas muestran un mensaje cuando falla la carga de datos`.

### Task 4: Acciones que fallan muestran el error
**Files:** `BranchesPage`, `ProfessionalsPage`, `ServicesPage`, `SpecialtiesPage` (activar/desactivar: `catch` → `actionError` mostrado con FormError arriba de la lista), `ProfessionalsPage.openCreateModal` (`catch` → `setFormError`), `UpdatePasswordPage` (efecto en try/catch → mensaje y fin de carga), `DashboardHeader` (logout ya no lanza tras Task 2).
- [ ] Implementar; `npm test`, build, lint.
- [ ] Commit `fix: activar, desactivar y cargar perfiles muestran el error si fallan`.

### Task 5: Pendientes de HU09
**Files:** `src/utils/supabaseErrors.ts(+test)`, `src/components/booking/specialtyIcons.ts` → `getSpecialtyIcon(name: string): LucideIcon` con test `specialtyIcons.test.ts`; usos en `AttentionStep` y `SpecialtiesSection`.
- [ ] Test: `friendlyWriteError('permission denied for table schedule_exceptions')` → `'No tienes permiso para modificar esta sede.'`.
- [ ] Test: `getSpecialtyIcon('Odontología General')` → Smile; `'ORTODONCIA'` → MoveHorizontal; `'Endodoncia'` → Syringe; `'Periodoncia'` → ShieldPlus; `'Odontopediatria'` → Baby; `'Cirugía oral'` → Scissors; `'Estética'` → Smile.
- [ ] Ver fallar; implementar con `normalizeText` y una lista `[fragmento, icono]` (`ortodon`, `endodon`, `periodon`, `pediatr`, `cirug`, `general`); ver pasar.
- [ ] Commits `fix: mensaje de permisos también para permission denied` y `refactor: icono de especialidad por nombre`.

### Task 6: README
- [ ] Reescribir según spec (incluye "Antes de producción" y la nota sobre `db push`). Commit `docs: README del proyecto`.

### Task 7: Guía de verificación
- [ ] `docs/sprint3-verificacion.md` con tablas HU09–HU12 + por rol, recorriendo el código de cada criterio y anotando lo no implementado. Commit `docs: guía de verificación del Sprint 3`.

### Task 8: Verificación final y revisión
- [ ] `npm test`, `npm run build`, `npm run lint` con salida mostrada; requesting-code-review contra la spec; mantener la rama.

**Comprobaciones SQL:** no hay cambios de SQL ni RLS en este plan.
