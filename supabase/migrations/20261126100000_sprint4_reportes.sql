-- =============================================================================
-- Sprint 4: reportes "Mis citas", "Mis pacientes" e "Historia de paciente".
-- Se puede correr dos veces sin error. Solo usa funciones de la migración
-- inicial (is_admin_global, current_user_role): no depende de my_branch_ids().
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Datos del paciente para la historia: N.º de historia, nacimiento, domicilio
-- -----------------------------------------------------------------------------
create sequence if not exists public.patients_history_number_seq;

alter table public.patients
  add column if not exists history_number integer,
  add column if not exists birth_date date,
  add column if not exists address text;

-- Los pacientes que ya existen reciben su número por orden de registro.
with numbered as (
  select id, row_number() over (order by created_at, id) as n
  from public.patients
  where history_number is null
)
update public.patients p
set history_number = numbered.n + coalesce((select max(history_number) from public.patients), 0)
from numbered
where p.id = numbered.id;

select setval(
  'public.patients_history_number_seq',
  greatest(coalesce((select max(history_number) from public.patients), 0), 1),
  coalesce((select max(history_number) from public.patients), 0) > 0
);

alter table public.patients
  alter column history_number set default nextval('public.patients_history_number_seq');
alter sequence public.patients_history_number_seq owned by public.patients.history_number;
alter table public.patients alter column history_number set not null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'patients_history_number_key') then
    alter table public.patients add constraint patients_history_number_key unique (history_number);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'patients_birth_date_check') then
    alter table public.patients
      add constraint patients_birth_date_check check (birth_date is null or birth_date > date '1900-01-01');
  end if;
end $$;

comment on column public.patients.history_number is
  'N.º de historia clínica (se muestra como HC-00245). Lo asigna la base.';

-- -----------------------------------------------------------------------------
-- 2. Sesiones por servicio: más de una = tratamiento (endodoncia, ortodoncia…)
-- -----------------------------------------------------------------------------
alter table public.services
  add column if not exists sessions smallint not null default 1;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'services_sessions_range') then
    alter table public.services add constraint services_sessions_range check (sessions between 1 and 60);
  end if;
end $$;

comment on column public.services.sessions is
  'Sesiones que requiere el servicio. Con más de una, la historia del paciente lo muestra como tratamiento.';

-- -----------------------------------------------------------------------------
-- 3. Promedio de atención de la sede (reporte "Mis citas")
-- -----------------------------------------------------------------------------
-- Solo cuenta atendidas y canceladas, sin datos de pacientes: la profesional
-- lo usa como referencia. Entran las sedes donde trabaja (o la elegida, si es
-- suya); el personal de sede, las suyas; admin_global, todas.
create or replace function public.branch_attendance_summary(
  p_from date,
  p_to date,
  p_branch_id uuid default null
)
returns table (completed bigint, cancelled bigint)
language sql
security definer
stable
set search_path = ''
as $$
  with allowed as (
    select pb.branch_id from public.professional_branches pb where pb.professional_id = auth.uid()
    union
    select uba.branch_id from public.user_branch_access uba where uba.user_id = auth.uid()
    union
    select b.id from public.branches b where public.is_admin_global()
  )
  select
    count(*) filter (where a.status = 'completed'),
    count(*) filter (where a.status = 'cancelled')
  from public.appointments a
  where a.appointment_date between p_from and p_to
    and a.branch_id in (select branch_id from allowed)
    and (p_branch_id is null or a.branch_id = p_branch_id);
$$;

revoke all on function public.branch_attendance_summary(date, date, uuid) from public;
grant execute on function public.branch_attendance_summary(date, date, uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- 4. Primera atención en la clínica de mis pacientes (reporte "Mis pacientes")
-- -----------------------------------------------------------------------------
-- Para saber si un paciente es nuevo o ya se atendió antes en la clínica, con
-- cualquier profesional. Solo devuelve pacientes con alguna cita de quien llama.
create or replace function public.my_patients_first_visit()
returns table (patient_id uuid, first_completed_on date)
language sql
security definer
stable
set search_path = ''
as $$
  select a.patient_id, min(a.appointment_date)
  from public.appointments a
  where a.status = 'completed'
    and a.patient_id in (select mine.patient_id from public.appointments mine where mine.professional_id = auth.uid())
  group by a.patient_id;
$$;

revoke all on function public.my_patients_first_visit() from public;
grant execute on function public.my_patients_first_visit() to authenticated;

-- -----------------------------------------------------------------------------
-- 5. Historia de paciente
-- -----------------------------------------------------------------------------
-- La profesional que atiende (o atendió) al paciente ve todas sus citas en la
-- clínica, con cualquier doctora. La técnica y la admin de sede, las de sus
-- sedes; admin_global, todas. Sin acceso: no devuelve filas.
create or replace function public.patient_history(p_patient_id uuid)
returns table (
  id uuid,
  appointment_date date,
  start_time time,
  status public.appointment_status,
  reason text,
  service_id uuid,
  service_name text,
  service_sessions smallint,
  professional_id uuid,
  professional_name text,
  branch_id uuid,
  branch_name text
)
language sql
security definer
stable
set search_path = ''
as $$
  select
    a.id,
    a.appointment_date,
    a.start_time,
    a.status,
    a.reason,
    a.service_id,
    coalesce(a.service_name, s.name),
    coalesce(s.sessions, 1::smallint),
    a.professional_id,
    pr.full_name,
    a.branch_id,
    b.name
  from public.appointments a
  left join public.services s on s.id = a.service_id
  left join public.profiles pr on pr.id = a.professional_id
  join public.branches b on b.id = a.branch_id
  where a.patient_id = p_patient_id
    and (
      public.is_admin_global()
      or exists (
        select 1 from public.appointments mine
        where mine.patient_id = p_patient_id and mine.professional_id = auth.uid()
      )
      or (
        public.current_user_role() in ('admin_sede', 'tecnica')
        and exists (
          select 1 from public.user_branch_access uba
          where uba.user_id = auth.uid() and uba.branch_id = a.branch_id
        )
      )
    )
  order by a.appointment_date desc, a.start_time desc;
$$;

revoke all on function public.patient_history(uuid) from public;
grant execute on function public.patient_history(uuid) to authenticated;

-- =============================================================================
-- COMPROBACIÓN MANUAL (SQL Editor)
--
-- a) Números de historia únicos y sin huecos de nulos:
--    select count(*), count(distinct history_number), count(history_number) from public.patients;
-- b) Un paciente nuevo recibe el siguiente número:
--    begin; insert into public.patients (dni, first_name, last_name) values ('99999999','Prueba','Prueba')
--    returning history_number; rollback;
-- c) Con la sesión de una profesional (ver 20261124000600_rls_rendimiento.sql,
--    set local role authenticated + request.jwt.claims):
--    select * from public.patient_history('<paciente suyo>');     -- todas sus citas en la clínica
--    select * from public.patient_history('<paciente ajeno>');    -- 0 filas
--    select * from public.my_patients_first_visit();              -- solo pacientes con citas suyas
--    select * from public.branch_attendance_summary('2026-07-01','2026-09-30');
-- d) Con la sesión de una técnica: patient_history solo trae citas de sus sedes.
-- =============================================================================
