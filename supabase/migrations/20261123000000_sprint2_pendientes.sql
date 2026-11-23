-- =============================================================================
-- Sprint 2 — Criterios pendientes de sedes, especialidades, profesionales y
-- horarios
-- =============================================================================
-- 1. Región obligatoria en branches (NOT VALID: las sedes viejas sin región
--    siguen, pero no se pueden guardar así otra vez).
--
-- Los triggers son SECURITY DEFINER (como enforce_specialist_single_specialty):
-- cuentan filas que la RLS de quien llama puede no dejarle ver.
--
-- Se puede correr dos veces sin error.
-- =============================================================================

-- --- 1. Región obligatoria ---------------------------------------------------
-- Sedes que hoy no tienen región (corrígelas desde el panel, botón Editar):
--
--   select id, name, address, region
--   from public.branches
--   where region is null or btrim(region) = ''
--   order by name;

alter table public.branches drop constraint if exists branches_region_required;
alter table public.branches
  add constraint branches_region_required
  check (region is not null and btrim(region) <> '') not valid;
