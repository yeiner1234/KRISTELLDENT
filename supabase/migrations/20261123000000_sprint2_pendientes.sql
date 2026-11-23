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

-- --- 2. No desactivar una sede con citas pendientes --------------------------
-- Cuenta las citas pending, confirmed o in_room de hoy en adelante (hoy en
-- hora de Lima: Supabase corre en UTC).
create or replace function public.prevent_branch_deactivation_with_appointments()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pending integer;
begin
  select count(*) into v_pending
  from public.appointments a
  where a.branch_id = new.id
    and a.status::text in ('pending', 'confirmed', 'in_room')
    and a.appointment_date >= (now() at time zone 'America/Lima')::date;

  if v_pending > 0 then
    raise exception 'No se puede desactivar: la sede tiene % citas pendientes.', v_pending
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

revoke all on function public.prevent_branch_deactivation_with_appointments() from public;

drop trigger if exists prevent_branch_deactivation_with_appointments on public.branches;
create trigger prevent_branch_deactivation_with_appointments
  before update of active on public.branches
  for each row
  when (old.active and not new.active)
  execute function public.prevent_branch_deactivation_with_appointments();
