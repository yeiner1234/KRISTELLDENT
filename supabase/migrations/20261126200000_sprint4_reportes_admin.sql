-- =============================================================================
-- Sprint 4: reportes de administración (citas, pacientes, desempeño, ingresos).
-- Se puede correr dos veces sin error. Solo usa funciones de la migración
-- inicial (is_admin_global, current_user_role). Requiere 20261126100000.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Promedios de la clínica (referencia para la admin de sede)
-- -----------------------------------------------------------------------------
-- La admin de sede solo lee las citas de su sede (RLS). Para comparar con la
-- clínica recibe totales agregados, sin datos de pacientes ni de otras sedes.
create or replace function public.clinic_benchmarks(p_from date, p_to date)
returns table (
  completed bigint,
  cancelled bigint,
  unclosed bigint,
  completed_minutes bigint,
  doctors bigint,
  patients_attended bigint,
  patients_recurrent bigint
)
language sql
security definer
stable
set search_path = ''
as $$
  with period as (
    select
      a.*,
      coalesce(
        a.service_duration_minutes,
        s.duration_minutes,
        (extract(epoch from (a.end_time - a.start_time)) / 60)::int
      ) as minutes
    from public.appointments a
    left join public.services s on s.id = a.service_id
    where a.appointment_date between p_from and p_to
      -- Sin rol de administración no cuenta nada (todo en cero).
      and public.current_user_role() in ('admin_global', 'admin_sede')
  ),
  attended as (
    select distinct patient_id from period where status = 'completed'
  )
  select
    count(*) filter (where status = 'completed'),
    count(*) filter (where status = 'cancelled'),
    count(*) filter (
      where status in ('pending', 'confirmed', 'in_room')
        and appointment_date < (now() at time zone 'America/Lima')::date
    ),
    coalesce(sum(minutes) filter (where status = 'completed'), 0)::bigint,
    count(distinct professional_id) filter (where status = 'completed'),
    (select count(*) from attended),
    (
      select count(*) from attended t
      where exists (
        select 1 from public.appointments b
        where b.patient_id = t.patient_id and b.status = 'completed' and b.appointment_date < p_from
      )
    )
  from period;
$$;

revoke all on function public.clinic_benchmarks(date, date) from public;
grant execute on function public.clinic_benchmarks(date, date) to authenticated;

-- -----------------------------------------------------------------------------
-- 2. Primera atención en la clínica de los pacientes que quien llama puede ver
-- -----------------------------------------------------------------------------
-- Nuevo / recurrente se decide con toda la clínica, aunque la admin de sede
-- solo vea su sede. admin_global: todos; admin_sede y técnica: pacientes con
-- citas en sus sedes; profesional: pacientes con citas suyas.
create or replace function public.patients_first_visit()
returns table (patient_id uuid, first_completed_on date)
language sql
security definer
stable
set search_path = ''
as $$
  select a.patient_id, min(a.appointment_date)
  from public.appointments a
  where a.status = 'completed'
    and (
      public.is_admin_global()
      or a.patient_id in (
        select v.patient_id
        from public.appointments v
        where v.professional_id = auth.uid()
           or (
             public.current_user_role() in ('admin_sede', 'tecnica')
             and exists (
               select 1 from public.user_branch_access uba
               where uba.user_id = auth.uid() and uba.branch_id = v.branch_id
             )
           )
      )
    )
  group by a.patient_id;
$$;

revoke all on function public.patients_first_visit() from public;
grant execute on function public.patients_first_visit() to authenticated;

-- =============================================================================
-- COMPROBACIÓN MANUAL (SQL Editor, con la sesión de cada rol: set local role
-- authenticated + request.jwt.claims)
--
-- a) Admin de sede: select * from public.clinic_benchmarks('2026-07-01','2026-09-30');
--    → una fila con los totales de toda la clínica.
-- b) Especialista o técnica: la misma consulta → completed = 0 (sin acceso).
-- c) Admin de sede: select count(*) from public.patients_first_visit();
--    → solo pacientes con citas en su sede.
-- =============================================================================
