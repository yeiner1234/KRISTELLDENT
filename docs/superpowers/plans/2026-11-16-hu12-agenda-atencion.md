# HU12 Agenda y atención de citas — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (elegido en CLAUDE.md) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agenda del admin filtrable con acciones de estado por rol, panel profesional por rol (especialista: solo lo suyo; técnica: "Citas de hoy" con Marcar llegada) y reprogramación validada contra el horario del profesional.

**Architecture:** La lógica nueva va en funciones puras (src/utils) y un hook de acción de estado; las páginas solo componen. La validación del caso límite vive en SQL (`reschedule_appointment`, SECURITY INVOKER) y el frontend la llama por RPC.

**Tech Stack:** React 19 + TS + Vite + Tailwind 4 + React Router 7, Supabase (Postgres/RLS), Vitest + RTL.

**Spec:** docs/superpowers/specs/2026-11-16-hu12-agenda-atencion.md

## Global Constraints
- Textos en español; reutilizar src/components/common y el estilo adm-*.
- "Hoy" siempre con getTodayIsoDate() (hora de Lima).
- Nunca comparar solo con 'especialista': usar PROFESSIONAL_ROLES.
- Migración nueva idempotente (create or replace / grant repetible), nombre AAAAMMDDHHMMSS_*.sql; no editar migraciones existentes.
- Errores de Supabase → mensaje visible; nada de botones o ruedas colgadas.
- Antes de cada commit: npm test, npm run build, npm run lint. Commits en español con prefijo; sin co-autor Claude.

## Review Focus
- Acción de estado que falla (mensaje del trigger, p. ej. "Una cita completada no puede pasar a en sala") → el mensaje se ve y el botón vuelve a estar habilitado. Test en Task 5.
- Búsqueda con mayúsculas/tildes parciales o DNI parcial → encuentra igual (minúsculas, includes). Test en Task 4.
- Cita de profesional inactivo → nombre visible, no "—" (getAllProfessionalsForAdmin). Test en Task 4 (lookup por id).
- Domingo en Lima con navegador en otra zona → la grilla abre en la semana correcta (cálculo por cadenas). Test en Task 2.
- Técnica con una cita cancelled o in_room hoy → sin botón Marcar llegada. Test en Task 3 y Task 8.

---

### Task 1: reschedule_appointment (caso límite 1)

**Files:**
- Create: `supabase/migrations/20261116000000_hu12_reprogramar_con_horario.sql`
- Modify: `src/services/appointmentService.ts` (rescheduleAppointment), `src/components/appointments/RescheduleAppointmentModal.tsx`
- Test: `src/services/appointmentService.test.ts`

**Interfaces:**
- Produces: `rescheduleAppointment(id: string, input: { date: string; startTime: string }): Promise<void>` → `supabase.rpc('reschedule_appointment', { p_appointment_id, p_date, p_start_time })`.

- [ ] Step 1: tests: (a) llama a rpc con `{ p_appointment_id: 'a1', p_date: '2026-11-20', p_start_time: '09:00' }`; (b) error `{ code: 'P0001', message: 'Ese horario está fuera del horario libre del profesional.' }` → rechaza con ese mensaje; (c) los dos 23P01 existentes pasan a mockear rpc.
- [ ] Step 2: correr `npx vitest run src/services/appointmentService.test.ts` → FAIL.
- [ ] Step 3: implementar; RescheduleAppointmentModal deja de calcular endTime.
- [ ] Step 4: tests PASS.
- [ ] Step 5: migración: función plpgsql security invoker, search_path ''. `select ... from public.appointments where id = p_appointment_id` (RLS) → si no hay fila: 'No se encontró la cita o no tienes permiso para modificarla.'; duración = services.duration_minutes o 30; si `not exists (select 1 from public.get_available_slots(...) s where s.slot_start = p_start_time)` → excepción del spec (errcode P0001); update de appointment_date, start_time, end_time = p_start_time + duración. `revoke all ... from public; grant execute ... to authenticated;`
- [ ] Comprobación manual SQL (SQL Editor, con `set local role authenticated; set local request.jwt.claims = '{"sub":"<uuid admin_sede>"}'` dentro de una transacción con rollback): `select public.reschedule_appointment('<cita>', '<fecha>', '23:00')` → error del caso límite; con una hora de get_available_slots → la cita cambia. Con el uuid de un admin de otra sede → 'No se encontró la cita…'.
- [ ] Step 6: commit `feat: reprogramar desde el panel valida el horario libre del profesional`.

### Task 2: Semana de la agenda en hora de Lima

**Files:** Modify `src/utils/date.ts`, `src/components/dashboard/AgendaGrid.tsx`; Test `src/utils/date.test.ts`.

**Interfaces:** Produces `addDaysToIsoDate(iso: string, days: number): string`, `getAgendaWeekStart(todayIso: string): string` (lunes que se muestra).

- [ ] Step 1: tests: `addDaysToIsoDate('2026-11-30', 1) === '2026-12-01'`, `('2026-03-01', -1) === '2026-02-28'`; `getAgendaWeekStart('2026-11-15')` (domingo) `=== '2026-11-16'`; `('2026-11-16')` (lunes) `=== '2026-11-16'`; `('2026-11-21')` (sábado) `=== '2026-11-16'`.
- [ ] Step 2: FAIL. Step 3: implementar con `Date.UTC` / `getUTCDay`. AgendaGrid guarda `weekStart` como cadena inicial `getAgendaWeekStart(getTodayIsoDate())`, días con addDaysToIsoDate, etiquetas con `new Date(\`${iso}T00:00:00\`)`; marca la columna de hoy.
- [ ] Step 4: PASS. Step 5: commit `fix: Mi agenda abre en la semana de hoy en hora de Lima`.

### Task 3: Acciones por estado y rol

**Files:** Create `src/utils/appointmentActions.ts` + test.

**Interfaces:** Produces
```ts
export type AppointmentAction = 'confirm' | 'arrive' | 'complete' | 'reschedule' | 'cancel';
export const ACTION_TARGET_STATUS: Record<Exclude<AppointmentAction, 'reschedule'>, AppointmentStatus>;
export const ACTION_LABELS: Record<AppointmentAction, string>; // Confirmar, Marcar llegada, Marcar como atendida, Reprogramar, Cancelar
export function getAppointmentActions(status: AppointmentStatus, role: AppRole): AppointmentAction[];
```
- [ ] Step 1: tests (admin_sede): pending → [confirm, arrive, reschedule, cancel]; confirmed → [arrive, reschedule, cancel]; in_room → [complete, cancel]; completed/cancelled → []. especialista: pending → [confirm, cancel]; in_room → [complete, cancel]. tecnica: pending/confirmed → [arrive]; in_room/cancelled → [].
- [ ] Step 2 FAIL, Step 3 implementar (tabla del trigger ∩ acciones del rol), Step 4 PASS, Step 5 commit `feat: acciones de cita según estado y rol`.

### Task 4: Vista y filtros de citas

**Files:** Create `src/utils/appointmentViews.ts` + test.

**Interfaces:** Produces
```ts
export interface AppointmentView { appointment: Appointment; patientName: string; patientDni: string; professionalName: string; serviceName: string; }
export interface AppointmentFilters { date: string; professionalId: string; status: AppointmentStatus | ''; branchId: string; query: string; } // '' = sin filtro
export function buildAppointmentViews(appointments, { patients, professionals, services }): AppointmentView[]; // orden fecha+hora asc; faltantes: 'Paciente', '', '—', '—'
export function filterAppointmentViews(views: AppointmentView[], filters: Partial<AppointmentFilters>): AppointmentView[];
export function patientsOfAppointments(patients: Patient[], appointments: Appointment[]): Patient[];
```
- [ ] Step 1: tests: buildAppointmentViews resuelve nombres por id (incluido profesional `active: false`) y ordena; filter por date, professionalId, status 'in_room', branchId; query 'kd-abc' (código), '4567' (DNI), 'ríos' (paciente), nombre de profesional; patientsOfAppointments deja solo los pacientes con cita.
- [ ] Step 2 FAIL, 3 implementar, 4 PASS, 5 commit `feat: vista y filtros de la agenda de citas`.

### Task 5: Hook de acción de estado

**Files:** Create `src/hooks/useAppointmentStatusAction.ts` + test.

**Interfaces:** Consumes `setAppointmentStatus`. Produces `useAppointmentStatusAction(onDone: () => void): { run(appointment: Appointment, status: AppointmentStatus): Promise<boolean>; pendingId: string | null; error: string | null; clearError(): void }`.
- [ ] Step 1: tests (renderHook, vi.mock del service): éxito → onDone llamado, pendingId vuelve a null, devuelve true; error 'Una cita completada no puede pasar a en sala.' → error con ese texto, pendingId null, onDone no llamado, devuelve false.
- [ ] Steps 2–4, commit `feat: hook para cambiar el estado de una cita con manejo de errores`.

### Task 6: Rutas por rol y sedes propias

**Files:** Create `src/utils/roleHome.ts` + test; Modify `src/routes/RoleRoute.tsx`, `src/pages/auth/LoginPage.tsx`, `src/pages/auth/UpdatePasswordPage.tsx`, `src/services/adminBranchService.ts` (+ test), `src/services/professionalService.ts`, Create `src/hooks/useManageableBranchIds.ts`.

**Interfaces:** Produces `homePathForRole(role: AppRole): '/admin' | '/profesional'`; `isAdminRole(role)`; `getManageableBranchIds(): Promise<string[] | null>` movida a adminBranchService (null = admin_global) e importada por professionalService; `useManageableBranchIds(): { branchIds: string[] | null; isLoading: boolean; error: string | null }`.
- [ ] Step 1: tests: homePathForRole('admin_sede') === '/admin', ('tecnica') === '/profesional'; getManageableBranchIds devuelve null para admin_global y los branch_id de user_branch_access para admin_sede.
- [ ] Step 2 FAIL, Step 3: RoleRoute: sin user → /login; rol no permitido → homePathForRole(user.role). Step 4 PASS. Commit `fix: un usuario sin permiso vuelve a su panel y no al login`.

### Task 7: Admin según rol y scroll

**Files:** Modify `src/layouts/AdminLayout.tsx`, `src/layouts/ProfessionalLayout.tsx` (`min-w-0` en la columna flex-1), `src/pages/admin/BranchesPage.tsx`, `SpecialtiesPage.tsx`, `ServicesPage.tsx` (TeamPage ya oculta Activar/Desactivar si no es admin_global: comprobar).
- [ ] BranchesPage: `isAdminGlobal = user?.role === 'admin_global'`; filtra con useManageableBranchIds (null = todas); oculta Nueva sede, Editar, Activar/Desactivar si no es global; deja Horario y Feriados.
- [ ] Specialties/Services: sin botón Nuevo ni columna de acciones si no es global.
- [ ] Manual: como admin_sede, Sedes muestra solo su sede; a 375 px no hay scroll horizontal de página.
- [ ] Commit `fix: admin_sede ve solo sus sedes y catálogos en solo lectura; sin scroll horizontal`.

### Task 8: Agenda del admin

**Files:** Modify `src/components/appointments/AppointmentModal.tsx`, Create `src/components/appointments/AppointmentActionButtons.tsx`, `src/components/appointments/AppointmentFiltersBar.tsx`; Modify `src/pages/admin/AppointmentsPage.tsx`, `src/pages/admin/AgendaPage.tsx`; Test `src/pages/admin/AppointmentsPage.test.tsx`.

**Interfaces:**
- `AppointmentActionButtons({ appointment, actions, busy, onAction(action) })` — botones size xs; cancel admin-danger; complete/arrive/confirm admin-solid.
- `AppointmentModal({ appointment, professionalName, patientLabel?, actions, onAction, busy, error, onClose })`.
- `AppointmentFiltersBar({ filters, onChange, professionals, branches?, showDate })` (branches solo se pasa a admin_global).
- [ ] Step 1: test RTL (hooks mockeados, setAppointmentStatus mockeado): con fecha de hoy muestra solo la cita de hoy; cambiar estado a "En sala" filtra; "Marcar llegada" en una confirmada llama setAppointmentStatus('a1','in_room'); si rechaza con mensaje del trigger, el mensaje aparece.
- [ ] Step 2 FAIL; Step 3: AppointmentsPage = filtros + DataTable (pageSize 200) con columnas Hora, Código, Paciente (nombre + DNI), Profesional, Servicio, Estado, Acciones; Reprogramar abre RescheduleAppointmentModal; Nueva cita recibe solo sedes gestionables. AgendaPage: misma barra sin fecha (la semana manda) y modal con acciones. Nombres con useAdminProfessionals.
- [ ] Step 4 PASS; commit `feat: agenda del admin con filtros, citas del día y acciones por estado`.

### Task 9: Panel profesional por rol

**Files:** Modify `src/components/dashboard/ProfessionalSidebar.tsx`, `src/routes/AppRouter.tsx`, `src/pages/professional/{DashboardPage,MyAgendaPage,MyAppointmentsPage,MyPatientsPage}.tsx`; Create `src/pages/professional/HomePage.tsx`, `src/pages/professional/TodayAppointmentsPage.tsx` + test.
- [ ] Step 1: test RTL TodayAppointmentsPage: muestra solo citas de hoy ordenadas por hora; "Marcar llegada" solo en pending/confirmed; al pulsar llama setAppointmentStatus(id,'in_room') y vuelve a pedir la lista; sin botones Reprogramar ni Marcar como atendida.
- [ ] Step 2 FAIL; Step 3: HomePage: tecnica → TodayAppointmentsPage, resto → DashboardPage. Rutas agenda/pacientes/citas dentro de `RoleRoute allowedRoles={PROFESSIONAL_ROLES}`. Sidebar tecnica: solo "Citas de hoy". Páginas profesionales filtran `professionalId === user.id`, pacientes con patientsOfAppointments, botón Marcar como atendida (getAppointmentActions), modal con professionalName = user.name.
- [ ] Step 4 PASS; commit `feat: panel profesional por rol con Citas de hoy para la técnica`.

### Task 10: Verificación y revisión
- [ ] `npm test`, `npm run build`, `npm run lint` con salida mostrada.
- [ ] requesting-code-review contra criterios y caso límite.
- [ ] Mantener la rama (sin merge/push/PR). Indicar la migración a aplicar.
