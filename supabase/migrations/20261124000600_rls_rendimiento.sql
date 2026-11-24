-- =============================================================================
-- Rendimiento de las lecturas del panel (RLS)
-- =============================================================================
-- Las políticas de lectura llamaban a is_admin_global(), current_user_role(),
-- has_branch_access(x) y shares_branch_with(x) UNA VEZ POR FILA: cada llamada
-- es una consulta aparte. Las pantallas del panel leen todas las citas, los
-- pacientes y las profesionales con sus sedes, especialidades, servicios y
-- horarios, así que una lista de miles de filas hacía miles de consultas
-- ocultas.
--
-- Ahora cada política calcula una sola vez por consulta (con "(select ...)",
-- que Postgres ejecuta una vez como InitPlan):
--   my_branch_ids()           sedes de quien consulta (= has_branch_access)
--   my_team_ids()             personas que comparten sede con quien consulta
--                             (= shares_branch_with, incluida la sede de
--                             Profesionales de 20261123200000)
--   active_professional_ids() fichas activas (lecturas públicas)
--   active_branch_ids()       sedes activas (lecturas públicas)
-- y compara cada fila contra esa lista. Las reglas son exactamente las
-- mismas; solo cambia cuántas veces se evalúan.
--
-- Solo cambia políticas de LECTURA (select). Las de escritura tocan pocas
-- filas y quedan igual.
--
-- Se puede correr dos veces sin error.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. Listas que se calculan una vez por consulta
-- -----------------------------------------------------------------------------
create or replace function public.my_branch_ids()
returns uuid[]
language sql
security definer
stable
set search_path = ''
as $$
  select coalesce(array_agg(branch_id), '{}'::uuid[])
  from public.user_branch_access
  where user_id = auth.uid();
$$;

create or replace function public.my_team_ids()
returns uuid[]
language sql
security definer
stable
set search_path = ''
as $$
  select coalesce(array_agg(distinct team.user_id), '{}'::uuid[])
  from (
    select target.user_id
    from public.user_branch_access self_access
    join public.user_branch_access target on target.branch_id = self_access.branch_id
    where self_access.user_id = auth.uid()
    union
    select pb.professional_id
    from public.user_branch_access self_access
    join public.professional_branches pb on pb.branch_id = self_access.branch_id
    where self_access.user_id = auth.uid()
  ) team;
$$;

create or replace function public.active_professional_ids()
returns uuid[]
language sql
security definer
stable
set search_path = ''
as $$
  select coalesce(array_agg(id), '{}'::uuid[]) from public.professionals where active;
$$;

create or replace function public.active_branch_ids()
returns uuid[]
language sql
security definer
stable
set search_path = ''
as $$
  select coalesce(array_agg(id), '{}'::uuid[]) from public.branches where active;
$$;

revoke all on function public.my_branch_ids() from public;
revoke all on function public.my_team_ids() from public;
revoke all on function public.active_professional_ids() from public;
revoke all on function public.active_branch_ids() from public;
grant execute on function public.my_branch_ids() to authenticated;
grant execute on function public.my_team_ids() to authenticated;
grant execute on function public.active_professional_ids() to anon, authenticated;
grant execute on function public.active_branch_ids() to anon, authenticated;


-- -----------------------------------------------------------------------------
-- 2. profiles
-- -----------------------------------------------------------------------------
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own
  on public.profiles for select
  to authenticated
  using (id = (select auth.uid()));

drop policy if exists profiles_select_admin_global on public.profiles;
create policy profiles_select_admin_global
  on public.profiles for select
  to authenticated
  using ((select public.is_admin_global()));

drop policy if exists profiles_select_admin_sede_staff on public.profiles;
create policy profiles_select_admin_sede_staff
  on public.profiles for select
  to authenticated
  using (
    (select public.current_user_role()) = 'admin_sede'
    and id = any ((select public.my_team_ids()))
  );


-- -----------------------------------------------------------------------------
-- 3. branches y user_branch_access
-- -----------------------------------------------------------------------------
drop policy if exists branches_select_admin_global on public.branches;
create policy branches_select_admin_global
  on public.branches for select
  to authenticated
  using ((select public.is_admin_global()));

drop policy if exists branches_select_assigned_staff on public.branches;
create policy branches_select_assigned_staff
  on public.branches for select
  to authenticated
  using (id = any ((select public.my_branch_ids())));

drop policy if exists user_branch_access_select_own on public.user_branch_access;
create policy user_branch_access_select_own
  on public.user_branch_access for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists user_branch_access_select_admin_global on public.user_branch_access;
create policy user_branch_access_select_admin_global
  on public.user_branch_access for select
  to authenticated
  using ((select public.is_admin_global()));

drop policy if exists user_branch_access_select_admin_sede_staff on public.user_branch_access;
create policy user_branch_access_select_admin_sede_staff
  on public.user_branch_access for select
  to authenticated
  using (
    (select public.current_user_role()) = 'admin_sede'
    and user_id = any ((select public.my_team_ids()))
  );


-- -----------------------------------------------------------------------------
-- 4. specialties y services (el personal ya ve todo con "using (true)")
-- -----------------------------------------------------------------------------
drop policy if exists specialties_select_admin_global on public.specialties;
create policy specialties_select_admin_global
  on public.specialties for select
  to authenticated
  using ((select public.is_admin_global()));

drop policy if exists services_select_admin_global on public.services;
create policy services_select_admin_global
  on public.services for select
  to authenticated
  using ((select public.is_admin_global()));


-- -----------------------------------------------------------------------------
-- 5. professionals y sus relaciones
-- -----------------------------------------------------------------------------
drop policy if exists professionals_select_own on public.professionals;
create policy professionals_select_own
  on public.professionals for select
  to authenticated
  using (id = (select auth.uid()));

drop policy if exists professionals_select_admin_global on public.professionals;
create policy professionals_select_admin_global
  on public.professionals for select
  to authenticated
  using ((select public.is_admin_global()));

drop policy if exists professionals_select_admin_sede_staff on public.professionals;
create policy professionals_select_admin_sede_staff
  on public.professionals for select
  to authenticated
  using (
    (select public.current_user_role()) = 'admin_sede'
    and id = any ((select public.my_team_ids()))
  );

drop policy if exists professional_branches_select_public on public.professional_branches;
create policy professional_branches_select_public
  on public.professional_branches for select
  to anon, authenticated
  using (professional_id = any ((select public.active_professional_ids())));

drop policy if exists professional_branches_select_admin on public.professional_branches;
create policy professional_branches_select_admin
  on public.professional_branches for select
  to authenticated
  using ((select public.is_admin_global()) or professional_id = any ((select public.my_team_ids())));

drop policy if exists professional_specialties_select_public on public.professional_specialties;
create policy professional_specialties_select_public
  on public.professional_specialties for select
  to anon, authenticated
  using (professional_id = any ((select public.active_professional_ids())));

drop policy if exists professional_specialties_select_admin on public.professional_specialties;
create policy professional_specialties_select_admin
  on public.professional_specialties for select
  to authenticated
  using ((select public.is_admin_global()) or professional_id = any ((select public.my_team_ids())));

drop policy if exists professional_services_select_public on public.professional_services;
create policy professional_services_select_public
  on public.professional_services for select
  to anon, authenticated
  using (professional_id = any ((select public.active_professional_ids())));

drop policy if exists professional_services_select_admin on public.professional_services;
create policy professional_services_select_admin
  on public.professional_services for select
  to authenticated
  using ((select public.is_admin_global()) or professional_id = any ((select public.my_team_ids())));


-- -----------------------------------------------------------------------------
-- 6. Horarios y excepciones
-- -----------------------------------------------------------------------------
drop policy if exists branch_schedules_select_public on public.branch_schedules;
create policy branch_schedules_select_public
  on public.branch_schedules for select
  to anon, authenticated
  using (branch_id = any ((select public.active_branch_ids())));

drop policy if exists branch_schedules_select_admin on public.branch_schedules;
create policy branch_schedules_select_admin
  on public.branch_schedules for select
  to authenticated
  using ((select public.is_admin_global()) or branch_id = any ((select public.my_branch_ids())));

drop policy if exists professional_schedules_select_public on public.professional_schedules;
create policy professional_schedules_select_public
  on public.professional_schedules for select
  to anon, authenticated
  using (
    professional_id = any ((select public.active_professional_ids()))
    and branch_id = any ((select public.active_branch_ids()))
  );

drop policy if exists professional_schedules_select_own on public.professional_schedules;
create policy professional_schedules_select_own
  on public.professional_schedules for select
  to authenticated
  using (professional_id = (select auth.uid()));

drop policy if exists professional_schedules_select_admin on public.professional_schedules;
create policy professional_schedules_select_admin
  on public.professional_schedules for select
  to authenticated
  using ((select public.is_admin_global()) or professional_id = any ((select public.my_team_ids())));

drop policy if exists schedule_exceptions_select_admin on public.schedule_exceptions;
create policy schedule_exceptions_select_admin
  on public.schedule_exceptions for select
  to authenticated
  using (
    (select public.is_admin_global())
    or (branch_id is not null and branch_id = any ((select public.my_branch_ids())))
    or (professional_id is not null and professional_id = any ((select public.my_team_ids())))
  );


-- -----------------------------------------------------------------------------
-- 7. appointments (patients se apoya en estas: "tengo una cita visible")
-- -----------------------------------------------------------------------------
drop policy if exists appointments_select_admin_global on public.appointments;
create policy appointments_select_admin_global
  on public.appointments for select
  to authenticated
  using ((select public.is_admin_global()));

drop policy if exists appointments_select_branch_staff on public.appointments;
create policy appointments_select_branch_staff
  on public.appointments for select
  to authenticated
  using (
    (select public.current_user_role()) in ('admin_sede', 'tecnica')
    and branch_id = any ((select public.my_branch_ids()))
  );

drop policy if exists appointments_select_own_professional on public.appointments;
create policy appointments_select_own_professional
  on public.appointments for select
  to authenticated
  using (professional_id = (select auth.uid()));


-- =============================================================================
-- COMPROBACIÓN (opcional): con la sesión de un admin, en el SQL Editor
--
--   begin;
--   set local role authenticated;
--   select set_config('request.jwt.claims',
--     json_build_object('sub', '<UUID_ADMIN>', 'role', 'authenticated')::text, true);
--   explain analyze select id from public.appointments;
--   rollback;
--
-- En el plan deben aparecer "InitPlan" (las listas se calculan una vez) y el
-- tiempo total debe bajar mucho frente a antes de esta migración.
-- =============================================================================
