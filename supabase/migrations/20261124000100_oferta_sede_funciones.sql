-- =============================================================================
-- Oferta autónoma por sede · 2 de 4 · Funciones de oferta y reserva
-- =============================================================================
-- Spec: docs/especificaciones/2026-11-23-oferta-autonoma-por-sede.md
-- (secciones 6, 7.3 y 8). Requiere 20261124000000_oferta_sede_estructura.sql.
--
-- Servicio reservable (sección 6): activo, de especialidad activa, en una sede
-- activa, y con al menos una profesional activa (ficha y cuenta) que lo tiene
-- asignado (fila activa), tiene su especialidad y tiene horario en esa sede.
-- Toda la regla vive en offer_bookable_pairs(); las demás funciones la usan.
--
-- Se puede correr dos veces sin error.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. Regla de "reservable" (interna)
-- -----------------------------------------------------------------------------
-- Pares (servicio, profesional) que se pueden reservar. p_branch_id null =
-- todas las sedes. Solo la llaman otras funciones SECURITY DEFINER.
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
      where pb.professional_id = ps.professional_id and pb.branch_id = s.branch_id
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
-- 2. Funciones públicas de la oferta (reserva)
-- -----------------------------------------------------------------------------
create or replace function public.get_branch_specialties(p_branch_id uuid)
returns table (id uuid, name text, description text)
language sql
security definer
stable
set search_path = ''
as $$
  select distinct sp.id, sp.name, sp.description
  from public.offer_bookable_pairs(p_branch_id) bp
  join public.services s on s.id = bp.service_id
  join public.specialties sp on sp.id = s.specialty_id
  where p_branch_id is not null
  order by sp.name;
$$;

revoke all on function public.get_branch_specialties(uuid) from public;
grant execute on function public.get_branch_specialties(uuid) to anon, authenticated, service_role;

create or replace function public.get_bookable_services(
  p_branch_id uuid,
  p_specialty_id uuid default null,
  p_professional_id uuid default null
)
returns table (
  id uuid,
  name text,
  specialty_id uuid,
  specialty_name text,
  price numeric,
  duration_minutes integer
)
language sql
security definer
stable
set search_path = ''
as $$
  select distinct s.id, s.name, s.specialty_id, sp.name, s.price, s.duration_minutes
  from public.offer_bookable_pairs(p_branch_id) bp
  join public.services s on s.id = bp.service_id
  join public.specialties sp on sp.id = s.specialty_id
  where p_branch_id is not null
    and (p_specialty_id is null or s.specialty_id = p_specialty_id)
    and (p_professional_id is null or bp.professional_id = p_professional_id)
  order by s.name;
$$;

revoke all on function public.get_bookable_services(uuid, uuid, uuid) from public;
grant execute on function public.get_bookable_services(uuid, uuid, uuid) to anon, authenticated, service_role;

create or replace function public.get_bookable_professionals(
  p_branch_id uuid,
  p_specialty_id uuid default null,
  p_service_id uuid default null
)
returns table (id uuid, full_name text)
language sql
security definer
stable
set search_path = ''
as $$
  select distinct pr.id, pr.full_name
  from public.offer_bookable_pairs(p_branch_id) bp
  join public.services s on s.id = bp.service_id
  join public.profiles pr on pr.id = bp.professional_id
  where p_branch_id is not null
    and (p_specialty_id is null or s.specialty_id = p_specialty_id)
    and (p_service_id is null or s.id = p_service_id)
  order by pr.full_name;
$$;

revoke all on function public.get_bookable_professionals(uuid, uuid, uuid) from public;
grant execute on function public.get_bookable_professionals(uuid, uuid, uuid) to anon, authenticated, service_role;

-- ¿Se puede reservar este servicio, en esta sede, con esta profesional? La
-- usan get_available_slots, reschedule_appointment y las Edge Functions.
create or replace function public.is_bookable_service(
  p_branch_id uuid,
  p_service_id uuid,
  p_professional_id uuid
)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.offer_bookable_pairs(p_branch_id) bp
    where bp.service_id = p_service_id and bp.professional_id = p_professional_id
  );
$$;

revoke all on function public.is_bookable_service(uuid, uuid, uuid) from public;
grant execute on function public.is_bookable_service(uuid, uuid, uuid) to anon, authenticated, service_role;


-- -----------------------------------------------------------------------------
-- 3. Funciones de administración
-- -----------------------------------------------------------------------------
-- Estado de la oferta de una sede: cada servicio con sus profesionales, si es
-- reservable y, si no, por qué. admin_sede solo sus sedes.
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
  assigned as (
    select
      ps.service_id,
      jsonb_agg(
        jsonb_build_object(
          'id', pr.id,
          'full_name', pr.full_name,
          'active', p.active and pr.active,
          'has_schedule', exists (
            select 1 from public.professional_schedules sch
            where sch.professional_id = ps.professional_id and sch.branch_id = ps.branch_id
          ),
          'bookable', exists (
            select 1 from pairs
            where pairs.service_id = ps.service_id and pairs.professional_id = ps.professional_id
          )
        )
        order by pr.full_name
      ) as professionals,
      bool_or(p.active and pr.active) as any_active
    from public.professional_services ps
    join public.professionals p on p.id = ps.professional_id
    join public.profiles pr on pr.id = ps.professional_id
    where ps.branch_id = p_branch_id and ps.active
    group by ps.service_id
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
      when not coalesce(a.any_active, false) then 'No visible en reservas: falta asignar una profesional.'
      else 'No visible en reservas: la profesional asignada no tiene horario en esta sede.'
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

-- Supervisión (solo admin_global): por sede y especialidad, cuántos
-- servicios hay, cuántos activos, cuántos reservables y el rango de precios
-- de los activos.
create or replace function public.get_offer_overview()
returns table (
  branch_id uuid,
  branch_name text,
  branch_active boolean,
  specialty_id uuid,
  specialty_name text,
  specialty_active boolean,
  services_count integer,
  active_count integer,
  bookable_count integer,
  min_price numeric,
  max_price numeric
)
language plpgsql
security definer
stable
set search_path = ''
as $$
#variable_conflict use_column
begin
  if not public.is_admin_global() then
    raise exception 'Solo la administradora global ve la oferta de todas las sedes.'
      using errcode = '42501';
  end if;

  return query
  with bookable as (
    select distinct bp.service_id from public.offer_bookable_pairs(null) bp
  )
  select
    b.id,
    b.name,
    b.active,
    sp.id,
    sp.name,
    sp.active,
    count(*)::integer,
    (count(*) filter (where s.active))::integer,
    (count(*) filter (where bk.service_id is not null))::integer,
    min(s.price) filter (where s.active),
    max(s.price) filter (where s.active)
  from public.services s
  join public.branches b on b.id = s.branch_id
  join public.specialties sp on sp.id = s.specialty_id
  left join bookable bk on bk.service_id = s.id
  group by b.id, b.name, b.active, sp.id, sp.name, sp.active
  order by b.name, sp.name;
end;
$$;

revoke all on function public.get_offer_overview() from public, anon;
grant execute on function public.get_offer_overview() to authenticated;

-- Lista compartida de especialidades para el panel: quién la agregó (un
-- admin_sede no puede leer todos los perfiles) y en qué sedes se ofrece
-- (sedes con al menos un servicio reservable de esa especialidad).
create or replace function public.get_specialties_admin()
returns table (
  id uuid,
  name text,
  description text,
  active boolean,
  created_by_name text,
  branch_names text[]
)
language plpgsql
security definer
stable
set search_path = ''
as $$
#variable_conflict use_column
begin
  if not (public.is_admin_global() or public.current_user_role() = 'admin_sede') then
    raise exception 'No tienes permiso para ver esta lista.'
      using errcode = '42501';
  end if;

  return query
  with offered as (
    select distinct s.specialty_id, b.name as branch_name
    from public.offer_bookable_pairs(null) bp
    join public.services s on s.id = bp.service_id
    join public.branches b on b.id = s.branch_id
  )
  select
    sp.id,
    sp.name,
    sp.description,
    sp.active,
    pr.full_name,
    coalesce(
      (select array_agg(o.branch_name order by o.branch_name) from offered o where o.specialty_id = sp.id),
      '{}'::text[]
    )
  from public.specialties sp
  left join public.profiles pr on pr.id = sp.created_by
  order by sp.name;
end;
$$;

revoke all on function public.get_specialties_admin() from public, anon;
grant execute on function public.get_specialties_admin() to authenticated;


-- -----------------------------------------------------------------------------
-- 4. Directorio de profesionales (sección 7.3)
-- -----------------------------------------------------------------------------
-- Para que una admin_sede encuentre a una profesional de otra sede y la sume
-- a la suya. Solo datos de oferta: sin correo, teléfono ni citas.
create or replace function public.search_professionals_directory(p_query text)
returns table (
  id uuid,
  full_name text,
  role public.app_role,
  specialty_names text[],
  branch_ids uuid[],
  branch_names text[]
)
language plpgsql
security definer
stable
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_term text := replace(replace(coalesce(public.name_key(p_query), ''), '%', ''), '_', '');
begin
  if not (public.is_admin_global() or public.current_user_role() = 'admin_sede') then
    raise exception 'No tienes permiso para buscar en el directorio.'
      using errcode = '42501';
  end if;

  return query
  select
    p.id,
    pr.full_name,
    pr.role,
    coalesce(
      (select array_agg(sp.name order by sp.name)
       from public.professional_specialties x
       join public.specialties sp on sp.id = x.specialty_id
       where x.professional_id = p.id),
      '{}'::text[]
    ),
    coalesce(
      (select array_agg(b.id order by b.name)
       from public.professional_branches pb
       join public.branches b on b.id = pb.branch_id
       where pb.professional_id = p.id),
      '{}'::uuid[]
    ),
    coalesce(
      (select array_agg(b.name order by b.name)
       from public.professional_branches pb
       join public.branches b on b.id = pb.branch_id
       where pb.professional_id = p.id),
      '{}'::text[]
    )
  from public.professionals p
  join public.profiles pr on pr.id = p.id
  where p.active
    and pr.active
    and public.name_key(pr.full_name) like '%' || v_term || '%'
  order by pr.full_name
  limit 30;
end;
$$;

revoke all on function public.search_professionals_directory(text) from public, anon;
grant execute on function public.search_professionals_directory(text) to authenticated;


-- -----------------------------------------------------------------------------
-- 5. Motor de disponibilidad (sección 8)
-- -----------------------------------------------------------------------------
-- Copia de 20261115100000_hu09_turno_extra_por_sede.sql. Único cambio: la
-- comprobación "ofrece ese servicio" ahora es is_bookable_service (el
-- servicio es de esa sede, es reservable y esa profesional lo atiende).
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

  -- Atiende en esa sede.
  if not exists (
    select 1 from public.professional_branches
    where professional_id = p_professional_id and branch_id = p_branch_id
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
-- 6. Reprogramar desde el panel (sección 8)
-- -----------------------------------------------------------------------------
-- Copia de 20261116000000_hu12_reprogramar_con_horario.sql, más la
-- validación del servicio con un mensaje claro. La copia del servicio en la
-- cita (nombre, precio, duración) la refresca el trigger
-- appointments_copy_service al cambiar fecha u hora.
create or replace function public.reschedule_appointment(
  p_appointment_id uuid,
  p_date date,
  p_start_time time
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_appointment record;
  v_end_time time;
begin
  select a.id, a.professional_id, a.branch_id, a.service_id
  into v_appointment
  from public.appointments a
  where a.id = p_appointment_id;

  if not found then
    raise exception 'No se encontró la cita o no tienes permiso para modificarla.'
      using errcode = 'P0001';
  end if;

  if v_appointment.service_id is not null
     and not public.is_bookable_service(v_appointment.branch_id, v_appointment.service_id, v_appointment.professional_id) then
    raise exception 'Este servicio no se brinda en esta sede.'
      using errcode = 'P0001';
  end if;

  select s.slot_end into v_end_time
  from public.get_available_slots(
    v_appointment.professional_id,
    v_appointment.branch_id,
    v_appointment.service_id,
    p_date,
    p_appointment_id
  ) s
  where s.slot_start = p_start_time
  limit 1;

  if v_end_time is null then
    raise exception 'Ese horario está fuera del horario libre del profesional.'
      using errcode = 'P0001';
  end if;

  update public.appointments
  set appointment_date = p_date,
      start_time = p_start_time,
      end_time = v_end_time
  where id = p_appointment_id;

  if not found then
    raise exception 'No se encontró la cita o no tienes permiso para modificarla.'
      using errcode = 'P0001';
  end if;
end;
$$;

revoke all on function public.reschedule_appointment(uuid, date, time) from public, anon;
grant execute on function public.reschedule_appointment(uuid, date, time) to authenticated;
