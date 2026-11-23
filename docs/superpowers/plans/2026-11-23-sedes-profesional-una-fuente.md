# Sedes de una profesional: una sola fuente — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (CLAUDE.md: ejecución en esta misma sesión). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que asignar una sede en Profesionales baste para que el admin de esa sede gestione a la profesional, y que no se creen cuentas duplicadas.

**Spec:** docs/superpowers/specs/2026-11-23-sedes-profesional-una-fuente.md

## Global Constraints
- Migración nueva `supabase/migrations/20261123100000_sedes_profesional_desde_profesionales.sql`, re-ejecutable.
- TDD en `src/services/teamService.ts`. Antes de cada commit: `npm test`, `npm run build`, `npm run lint`.

### Task 1: Migración
- [ ] `sync_professional_branch_access()` SECURITY DEFINER + trigger after insert/update/delete en `professional_branches`, solo roles profesionales.
- [ ] Copia inicial con `on conflict do nothing`; consulta en comentario de accesos en Equipo sin sede en Profesionales.
- [ ] Commit `feat: las sedes de una profesional se asignan solo en Profesionales`.

### Task 2: teamService
- [ ] Test: `getTeamMembers` toma las sedes de las profesionales de `professional_branches` y marca `branchesFromProfessionals`; las demás siguen de `user_branch_access`.
- [ ] Test: `inviteInternalUser` traduce "A user with this email address has already been registered" al mensaje de cuenta existente.
- [ ] Ver fallar, implementar, ver pasar.

### Task 3: Edge Function create-internal-user
- [ ] Busca el correo en `profiles` antes de invitar → 409 con el mensaje; traduce también el error de Auth.

### Task 4: TeamPage
- [ ] Test RTL: correo ya presente en Equipo → mensaje y no llama a `inviteInternalUser`; tarjeta de profesional muestra "Se asignan en Profesionales".
- [ ] Modal: para roles profesionales, "Sede inicial…" bajo Sedes asignadas.
- [ ] Commit `feat: una persona, una cuenta; Equipo muestra las sedes de Profesionales`.
