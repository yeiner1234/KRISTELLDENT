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

-- --- 3. No desactivar una especialidad con servicios activos ----------------
create or replace function public.prevent_specialty_deactivation_with_services()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_active integer;
begin
  select count(*) into v_active
  from public.services s
  where s.specialty_id = new.id
    and s.active;

  if v_active > 0 then
    raise exception 'Tiene % servicios activos: desactívalos primero.', v_active
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

revoke all on function public.prevent_specialty_deactivation_with_services() from public;

drop trigger if exists prevent_specialty_deactivation_with_services on public.specialties;
create trigger prevent_specialty_deactivation_with_services
  before update of active on public.specialties
  for each row
  when (old.active and not new.active)
  execute function public.prevent_specialty_deactivation_with_services();

-- --- 6. Un profesional solo ofrece servicios de sus especialidades ----------
-- Solo revisa altas y cambios. Filas que hoy no cumplen (se corrigen al
-- volver a guardar a ese profesional desde el panel):
--
--   select ps.professional_id, pr.full_name, s.name as servicio, sp.name as especialidad
--   from public.professional_services ps
--   join public.services s on s.id = ps.service_id
--   join public.specialties sp on sp.id = s.specialty_id
--   left join public.profiles pr on pr.id = ps.professional_id
--   where not exists (
--     select 1 from public.professional_specialties x
--     where x.professional_id = ps.professional_id and x.specialty_id = s.specialty_id
--   );
create or replace function public.enforce_service_matches_specialty()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.services s
    join public.professional_specialties ps
      on ps.specialty_id = s.specialty_id
     and ps.professional_id = new.professional_id
    where s.id = new.service_id
  ) then
    raise exception 'El servicio pertenece a una especialidad que el profesional no tiene.'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_service_matches_specialty() from public;

drop trigger if exists enforce_service_matches_specialty on public.professional_services;
create trigger enforce_service_matches_specialty
  before insert or update on public.professional_services
  for each row
  execute function public.enforce_service_matches_specialty();

-- =============================================================================
-- ANTES DE APLICAR LOS PUNTOS 8 Y 9: revisa los horarios actuales.
-- =============================================================================
-- Corre estas consultas solas en el SQL Editor. Si devuelven filas, corrige
-- esos horarios desde el panel (Profesionales → Horario) y vuelve a correrlas
-- hasta que salgan vacías. Después pega esta migración completa.
--
-- 8. Horarios de profesionales fuera del horario de su sede (o en un día en
--    que la sede está cerrada). El trigger solo revisa altas y cambios, así
--    que estas filas no rompen la migración, pero quedarían incoherentes:
--
--   select pr.full_name, b.name as sede, ps.day_of_week,
--          ps.start_time, ps.end_time, bs.open_time, bs.close_time
--   from public.professional_schedules ps
--   join public.branches b on b.id = ps.branch_id
--   left join public.profiles pr on pr.id = ps.professional_id
--   left join public.branch_schedules bs
--     on bs.branch_id = ps.branch_id and bs.day_of_week = ps.day_of_week
--   where bs.id is null
--      or ps.start_time < bs.open_time
--      or ps.end_time > bs.close_time
--   order by pr.full_name, ps.day_of_week, ps.start_time;
--
-- 9. Horarios de una misma profesional que se cruzan el mismo día (en
--    sedes distintas o en la misma). La restricción de exclusión revisa las
--    filas existentes: si esta consulta devuelve algo, la migración FALLA
--    en el punto 9 hasta que se corrijan:
--
--   select pr.full_name, a.day_of_week,
--          ba.name as sede_1, a.start_time as inicio_1, a.end_time as fin_1,
--          bb.name as sede_2, b.start_time as inicio_2, b.end_time as fin_2
--   from public.professional_schedules a
--   join public.professional_schedules b
--     on b.professional_id = a.professional_id
--    and b.day_of_week = a.day_of_week
--    and a.id < b.id
--    and a.start_time < b.end_time
--    and b.start_time < a.end_time
--   join public.branches ba on ba.id = a.branch_id
--   join public.branches bb on bb.id = b.branch_id
--   left join public.profiles pr on pr.id = a.professional_id
--   order by pr.full_name, a.day_of_week, a.start_time;

-- --- 8. Horario del profesional dentro del de la sede ------------------------
create or replace function public.enforce_schedule_within_branch_hours()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.branch_schedules bs
    where bs.branch_id = new.branch_id
      and bs.day_of_week = new.day_of_week
      and new.start_time >= bs.open_time
      and new.end_time <= bs.close_time
  ) then
    raise exception 'El horario del profesional debe estar dentro del horario de la sede.'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_schedule_within_branch_hours() from public;

drop trigger if exists enforce_schedule_within_branch_hours on public.professional_schedules;
create trigger enforce_schedule_within_branch_hours
  before insert or update on public.professional_schedules
  for each row
  execute function public.enforce_schedule_within_branch_hours();

-- --- 9. Sin cruces de horario entre sedes el mismo día ----------------------
-- Rangos semiabiertos [inicio, fin): 09:00–13:00 y 13:00–17:00 solo se tocan.
-- La fecha fija 2000-01-01 solo convierte las horas en timestamps para poder
-- usar tsrange. btree_gist (para = sobre uuid y smallint) ya existe desde
-- 20260918210347_availability_engine.sql.
create extension if not exists btree_gist;

alter table public.professional_schedules drop constraint if exists professional_schedules_no_overlap;
alter table public.professional_schedules
  add constraint professional_schedules_no_overlap
  exclude using gist (
    professional_id with =,
    day_of_week with =,
    tsrange('2000-01-01'::date + start_time, '2000-01-01'::date + end_time) with &&
  );
