-- =============================================================================
-- Activa o desactivada por sede
-- =============================================================================
-- La cuenta es una para todas las sedes. Si una profesional atiende en varias
-- y una sede deja de ofrecerla, desactivar la cuenta la sacaba de TODAS. Ahora
-- se desactiva solo en esa sede (professional_branches.active = false):
--   - no sale en la reserva de esa sede (offer_bookable_pairs,
--     get_available_slots);
--   - conserva su horario y sus servicios ahí, para reactivarla tal cual
--     ("Quitar de esta sede" sí los borra);
--   - en sus otras sedes sigue igual.
-- La cambia admin_global o la admin_sede de esa sede, con
-- set_professional_branch_active.
--
-- Requiere 20261124000900_estado_cuenta_y_ficha.sql (get_branch_offer_status
-- parte de esa versión).
-- Se puede correr dos veces sin error.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. Columna
-- -----------------------------------------------------------------------------
alter table public.professional_branches
  add column if not exists active boolean not null default true;

comment on column public.professional_branches.active is
  'false = desactivada solo en esta sede: no sale en su reserva, pero conserva '
  'horario y servicios. La cuenta (profiles.active) vale para todas las sedes.';


-- -----------------------------------------------------------------------------
-- 2. Regla de "reservable": además, activa en esa sede
-- -----------------------------------------------------------------------------
-- Igual que en 20261124000100_oferta_sede_funciones.sql salvo "and pb.active".
create or replace function public.offer_bookable_pairs(p_branch_id uuid)
returns table (service_id uuid, professional_id uuid)
language sql
security definer
stable
set search_path = ''
as $$
  select s.id, ps.professional_id
  from public.services s
  join public.branches b on b.id = s.branch_id and b.active
  join public.specialties sp on sp.id = s.specialty_id and sp.active
  join public.professional_services ps on ps.service_id = s.id and ps.active
  join public.professionals p on p.id = ps.professional_id and p.active
  join public.profiles pr on pr.id = p.id and pr.active
  where s.active
    and (p_branch_id is null or s.branch_id = p_branch_id)
    and exists (
      select 1 from public.professional_branches pb
      where pb.professional_id = ps.professional_id and pb.branch_id = s.branch_id and pb.active
    )
    and exists (
      select 1 from public.professional_specialties x
      where x.professional_id = ps.professional_id and x.specialty_id = s.specialty_id
    )
    and exists (
      select 1 from public.professional_schedules sch
      where sch.professional_id = ps.professional_id and sch.branch_id = s.branch_id
    );
$$;

revoke all on function public.offer_bookable_pairs(uuid) from public, anon, authenticated;


-- -----------------------------------------------------------------------------
-- 3. Motor de disponibilidad
-- -----------------------------------------------------------------------------
-- Copia de 20261124000100_oferta_sede_funciones.sql. Único cambio: "atiende en
-- esa sede" exige además que esté activa ahí (vale también sin servicio, desde
-- el panel).
create or replace function public.get_available_slots(
  p_professional_id uuid,
  p_branch_id uuid,
  p_service_id uuid,
  p_date date,
  p_exclude_appointment_id uuid default null
)
returns table (slot_start time, slot_end time)
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  v_dow smallint := extract(dow from p_date);
  v_duration integer;
  v_branch_open time;
  v_branch_close time;
  v_available tsmultirange := '{}'::tsmultirange;
  v_full_day_blocked boolean;
  v_branch_closed_exception boolean;
  v_step interval := interval '30 minutes';
begin
  if p_date < (now() at time zone 'America/Lima')::date then
    return;
  end if;

  -- Profesional activo (ficha y cuenta).
  if not exists (
    select 1
    from public.professionals p
    join public.profiles pr on pr.id = p.id
    where p.id = p_professional_id and p.active = true and pr.active = true
  ) then
    return;
  end if;

  -- Atiende en esa sede y está activa ahí.
  if not exists (
    select 1 from public.professional_branches
    where professional_id = p_professional_id and branch_id = p_branch_id and active
  ) then
    return;
  end if;

  -- El servicio es de esa sede, es reservable y esta profesional lo atiende.
  if p_service_id is not null
     and not public.is_bookable_service(p_branch_id, p_service_id, p_professional_id) then
    return;
  end if;

  if p_service_id is not null then
    select duration_minutes into v_duration from public.services where id = p_service_id;
  end if;
  v_duration := coalesce(v_duration, 30);

  -- Cierre total de la sede ese día (feriado, etc.)
  select exists (
    select 1 from public.schedule_exceptions
    where branch_id = p_branch_id and professional_id is null
      and exception_date = p_date and is_available = false and start_time is null
  ) into v_branch_closed_exception;

  if v_branch_closed_exception then
    return;
  end if;

  select open_time, close_time into v_branch_open, v_branch_close
  from public.branch_schedules
  where branch_id = p_branch_id and day_of_week = v_dow;

  if v_branch_open is null then
    return; -- sede cerrada ese día de la semana
  end if;

  -- ¿Profesional fuera todo el día? (vacaciones, licencia, etc.)
  select exists (
    select 1 from public.schedule_exceptions
    where professional_id = p_professional_id and exception_date = p_date
      and (branch_id is null or branch_id = p_branch_id)
      and is_available = false and start_time is null
  ) into v_full_day_blocked;

  if not v_full_day_blocked then
    select coalesce(
      range_agg(tsrange(
        p_date + greatest(ps.start_time, v_branch_open),
        p_date + least(ps.end_time, v_branch_close)
      )),
      '{}'::tsmultirange
    )
    into v_available
    from public.professional_schedules ps
    where ps.professional_id = p_professional_id
      and ps.branch_id = p_branch_id
      and ps.day_of_week = v_dow
      and ps.start_time < v_branch_close
      and ps.end_time > v_branch_open;
  end if;

  -- Restar bloqueos puntuales (ej. el especialista sale antes ese día)
  select v_available - coalesce(
    range_agg(tsrange(p_date + se.start_time, p_date + se.end_time)),
    '{}'::tsmultirange
  )
  into v_available
  from public.schedule_exceptions se
  where se.professional_id = p_professional_id and se.exception_date = p_date
    and (se.branch_id is null or se.branch_id = p_branch_id)
    and se.is_available = false and se.start_time is not null and se.end_time is not null;

  -- Sumar disponibilidad extra puntual (ej. cubre un turno adicional ese día),
  -- acotada siempre al horario de la sede.
  select v_available + coalesce(
    range_agg(tsrange(
      p_date + greatest(se.start_time, v_branch_open),
      p_date + least(se.end_time, v_branch_close)
    )),
    '{}'::tsmultirange
  )
  into v_available
  from public.schedule_exceptions se
  where se.professional_id = p_professional_id and se.exception_date = p_date
    and (se.branch_id is null or se.branch_id = p_branch_id)
    and se.is_available = true and se.start_time is not null and se.end_time is not null
    and se.start_time < v_branch_close and se.end_time > v_branch_open;

  -- Restar citas ya reservadas (no canceladas): una cancelada libera su
  -- horario de nuevo. La cita que se está reprogramando no cuenta.
  select v_available - coalesce(
    range_agg(tsrange(p_date + a.start_time, p_date + a.end_time)),
    '{}'::tsmultirange
  )
  into v_available
  from public.appointments a
  where a.professional_id = p_professional_id and a.appointment_date = p_date
    and a.status <> 'cancelled'
    and (p_exclude_appointment_id is null or a.id <> p_exclude_appointment_id);

  return query
    select (gs)::time as slot_start, (gs + make_interval(mins => v_duration))::time as slot_end
    from unnest(v_available) as r,
         generate_series(lower(r), upper(r) - make_interval(mins => v_duration), v_step) as gs
    where gs > (now() at time zone 'America/Lima')::timestamp
    order by slot_start;
end;
$$;

comment on function public.get_available_slots(uuid, uuid, uuid, date, uuid) is
  'Calcula los horarios realmente libres para un profesional en una sede, '
  'en una fecha (hora de Lima), para la duración del servicio dado. Vacío si '
  'el servicio no es de esa sede, no es reservable o esa profesional no lo '
  'atiende. Cruza branch_schedules + professional_schedules + '
  'schedule_exceptions + appointments no canceladas (menos '
  'p_exclude_appointment_id). No expone ninguna fila cruda, solo horas.';

revoke all on function public.get_available_slots(uuid, uuid, uuid, date, uuid) from public;
grant execute on function public.get_available_slots(uuid, uuid, uuid, date, uuid) to anon, authenticated, service_role;


-- -----------------------------------------------------------------------------
-- 4. Estado de la oferta: "desactivada en esta sede"
-- -----------------------------------------------------------------------------
-- Igual que en 20261124000900_estado_cuenta_y_ficha.sql, más branch_active por
-- profesional y su motivo.
create or replace function public.get_branch_offer_status(p_branch_id uuid)
returns table (
  service_id uuid,
  name text,
  specialty_id uuid,
  specialty_name text,
  specialty_active boolean,
  price numeric,
  duration_minutes integer,
  active boolean,
  professionals jsonb,
  bookable boolean,
  reason text
)
language plpgsql
security definer
stable
set search_path = ''
as $$
#variable_conflict use_column
begin
  if not (
    public.is_admin_global()
    or (public.current_user_role() = 'admin_sede' and public.has_branch_access(p_branch_id))
  ) then
    raise exception 'No tienes permiso para ver la oferta de esta sede.'
      using errcode = '42501';
  end if;

  return query
  with pairs as (
    select bp.service_id, bp.professional_id from public.offer_bookable_pairs(p_branch_id) bp
  ),
  assigned_rows as (
    select
      ps.service_id,
      ps.professional_id,
      pr.full_name,
      pr.active as account_active,
      p.active as record_active,
      coalesce(pb.active, false) as branch_active,
      (p.active and pr.active and coalesce(pb.active, false)) as is_active,
      exists (
        select 1 from public.professional_schedules sch
        where sch.professional_id = ps.professional_id and sch.branch_id = ps.branch_id
      ) as has_schedule
    from public.professional_services ps
    join public.professionals p on p.id = ps.professional_id
    join public.profiles pr on pr.id = ps.professional_id
    left join public.professional_branches pb
      on pb.professional_id = ps.professional_id and pb.branch_id = ps.branch_id
    where ps.branch_id = p_branch_id and ps.active
  ),
  assigned as (
    select
      ar.service_id,
      jsonb_agg(
        jsonb_build_object(
          'id', ar.professional_id,
          'full_name', ar.full_name,
          'active', ar.is_active,
          'account_active', ar.account_active,
          'record_active', ar.record_active,
          'branch_active', ar.branch_active,
          'has_schedule', ar.has_schedule,
          'bookable', exists (
            select 1 from pairs
            where pairs.service_id = ar.service_id and pairs.professional_id = ar.professional_id
          )
        )
        order by ar.full_name
      ) as professionals,
      bool_or(ar.account_active) as any_account_active,
      bool_or(ar.record_active) as any_record_active,
      bool_or(ar.branch_active) as any_branch_active,
      bool_or(ar.is_active) as any_active,
      bool_or(ar.is_active and ar.has_schedule) as any_active_with_schedule
    from assigned_rows ar
    group by ar.service_id
  )
  select
    s.id,
    s.name,
    s.specialty_id,
    sp.name,
    sp.active,
    s.price,
    s.duration_minutes,
    s.active,
    coalesce(a.professionals, '[]'::jsonb),
    exists (select 1 from pairs where pairs.service_id = s.id),
    case
      when not s.active then null
      when exists (select 1 from pairs where pairs.service_id = s.id) then null
      when not b.active then 'No visible en reservas: la sede está desactivada.'
      when not sp.active then 'No visible en reservas: la especialidad está desactivada.'
      when a.service_id is null then 'No visible en reservas: falta asignar una profesional.'
      when not a.any_account_active then 'No visible en reservas: la cuenta de la profesional asignada está desactivada (Equipo).'
      when not a.any_record_active then 'No visible en reservas: la ficha de la profesional asignada está desactivada.'
      when not a.any_branch_active then 'No visible en reservas: la profesional asignada está desactivada en esta sede.'
      when not a.any_active then 'No visible en reservas: ninguna profesional asignada tiene la cuenta, la ficha y esta sede activas.'
      when not a.any_active_with_schedule then 'No visible en reservas: la profesional asignada no tiene horario en esta sede.'
      else 'No visible en reservas: la profesional asignada no tiene la especialidad de este servicio.'
    end
  from public.services s
  join public.specialties sp on sp.id = s.specialty_id
  join public.branches b on b.id = s.branch_id
  left join assigned a on a.service_id = s.id
  where s.branch_id = p_branch_id
  order by sp.name, s.name;
end;
$$;

revoke all on function public.get_branch_offer_status(uuid) from public, anon;
grant execute on function public.get_branch_offer_status(uuid) to authenticated;


-- -----------------------------------------------------------------------------
-- 5. Activar o desactivar en una sede
-- -----------------------------------------------------------------------------
create or replace function public.set_professional_branch_active(
  p_professional_id uuid,
  p_branch_id uuid,
  p_active boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_professional_id is null or p_branch_id is null or p_active is null then
    raise exception 'Faltan datos para cambiar la sede.' using errcode = '22023';
  end if;

  if not (
    public.is_admin_global()
    or (public.current_user_role() = 'admin_sede' and public.has_branch_access(p_branch_id))
  ) then
    raise exception 'No administras esta sede.' using errcode = '42501';
  end if;

  update public.professional_branches
  set active = p_active
  where professional_id = p_professional_id and branch_id = p_branch_id;

  if not found then
    raise exception 'Esta profesional no atiende en esa sede.' using errcode = 'P0001';
  end if;
end;
$$;

comment on function public.set_professional_branch_active(uuid, uuid, boolean) is
  'Activa o desactiva a una profesional solo en una sede. admin_global o la '
  'admin_sede de esa sede.';

revoke all on function public.set_professional_branch_active(uuid, uuid, boolean) from public, anon;
grant execute on function public.set_professional_branch_active(uuid, uuid, boolean) to authenticated;


-- -----------------------------------------------------------------------------
-- Verificación (SQL Editor)
-- -----------------------------------------------------------------------------
-- a) Desactivar a ANali solo en Jaén, como la admin de Jaén (se deshace):
--   begin;
--   select set_config('request.jwt.claims', json_build_object('sub',
--     (select id from public.profiles where full_name = 'UserAdminSEDEJaen'), 'role', 'authenticated')::text, true);
--   set local role authenticated;
--   select public.set_professional_branch_active(
--     (select id from public.profiles where email = 'yeineredinsonc@gmail.com'),
--     (select id from public.branches where name = 'KristellDent Jaen'), false);
--   select b.name, g.full_name
--   from public.branches b, lateral public.get_bookable_professionals(b.id) g
--   order by b.name;   -- ANali ya no sale en Jaén; sí en Bagua.
--   rollback;
-- b) La misma llamada con la sede de Bagua responde "No administras esta sede."
