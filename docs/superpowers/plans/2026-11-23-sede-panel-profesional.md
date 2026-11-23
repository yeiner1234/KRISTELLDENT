# Sede en el panel profesional — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (CLAUDE.md: ejecución en esta misma sesión). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que quien trabaja en varias sedes sepa de qué sede es cada cita y pueda ver una sola sede en todo el panel.

**Spec:** docs/superpowers/specs/2026-11-23-sede-panel-profesional.md

**Architecture:** `myBranchesService` (Supabase) → `PanelBranchProvider` en `ProfessionalLayout` (carga, valor por defecto, sessionStorage) → `usePanelBranch()` en cada pantalla. Lógica pura en `utils/panelBranch.ts`. Sin migraciones.

## Global Constraints
- TDD en utils, services y hooks; RTL en las pantallas. Antes de cada commit: `npm test`, `npm run build`, `npm run lint`.
- Sin nuevas advertencias de lint: el contexto, el proveedor y el hook en archivos separados.

### Task 1: Lógica pura
- [ ] `defaultPanelBranch(branchIds, todayBranchIds)`: la única de hoy que sea suya, si no ''.
- [ ] `filterByPanelBranch(appointments, branchId)`: '' = todas.

### Task 2: Servicio
- [ ] `getMyPanelBranches(userId, role, dayOfWeek)` → `{ branchIds, todayBranchIds }` (profesional: professional_branches + professional_schedules; técnica: user_branch_access + branch_schedules).

### Task 3: Proveedor, hook y selector
- [ ] RTL: con dos sedes y horario hoy en una, el selector abre en esa; elegir otra se guarda en sessionStorage y sobrevive a un re-montaje; con una sola sede no hay selector.

### Task 4: Pantallas
- [ ] RTL Dashboard: muestra la sede de cada cita y filtra al elegir una sede.
- [ ] Mis citas, Mi agenda (+ detalle), Citas de hoy: etiqueta y filtro. Mis pacientes: filtro.
- [ ] Agenda imprimible: selector atado al del panel (RTL).

### Task 5: Cierre
- [ ] `npm test`, build, lint; revisión contra los 3 puntos.
