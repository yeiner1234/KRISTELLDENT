-- =============================================================================
-- FASE 10 — Motor de disponibilidad + reserva sin colisiones
-- =============================================================================
-- Dos piezas:
--   1. Restricción de exclusión a nivel de base de datos: ninguna cita
--      traslapada para el mismo profesional puede existir, sin importar qué
--      capa de aplicación intente insertarla (incluida una Edge Function con
--      un bug). Esto es lo que hace la reserva "sin colisiones" de verdad,
--      no una simple verificación de aplicación antes del INSERT.
--   2. public.get_available_slots(...): función SECURITY DEFINER que calcula
--      los horarios realmente libres cruzando horario de sede + horario del
--      profesional + excepciones puntuales + citas ya reservadas (no
--      canceladas). Se ejecuta con privilegios elevados para poder leer
--      appointments/schedule_exceptions (que anon no puede leer directo,
--      para no exponer datos de otros pacientes) pero SOLO devuelve horas
--      libres — nunca una fila cruda de esas tablas.
-- =============================================================================

create extension if not exists btree_gist;

-- --- 1. Restricción de exclusión (colisiones imposibles a nivel de BD) -------
alter table public.appointments
  add constraint appointments_no_overlap
  exclude using gist (
    professional_id with =,
    tsrange(appointment_date + start_time, appointment_date + end_time) with &&
  )
  where (status <> 'cancelled');

comment on constraint appointments_no_overlap on public.appointments is
  'Ninguna cita traslapada para el mismo profesional puede existir. Las '
  'citas canceladas quedan fuera de la restricción (liberan su horario). '
  'Esto es la fuente real de "reserva sin colisiones", no una verificación '
  'de aplicación que podría saltarse por una condición de carrera.';

-- --- 2. Motor de disponibilidad ----------------------------------------------
create or replace function public.get_available_slots(
  p_professional_id uuid,
  p_branch_id uuid,
  p_service_id uuid,
  p_date date
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
  if p_date < current_date then
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
    and se.is_available = true and se.start_time is not null and se.end_time is not null
    and se.start_time < v_branch_close and se.end_time > v_branch_open;

  -- Restar citas ya reservadas (no canceladas): una cancelada libera su
  -- horario de nuevo, por eso el filtro status <> 'cancelled'.
  select v_available - coalesce(
    range_agg(tsrange(p_date + a.start_time, p_date + a.end_time)),
    '{}'::tsmultirange
  )
  into v_available
  from public.appointments a
  where a.professional_id = p_professional_id and a.appointment_date = p_date
    and a.status <> 'cancelled';

  return query
    select (gs)::time as slot_start, (gs + make_interval(mins => v_duration))::time as slot_end
    from unnest(v_available) as r,
         generate_series(lower(r), upper(r) - make_interval(mins => v_duration), v_step) as gs
    order by slot_start;
end;
$$;

comment on function public.get_available_slots is
  'Calcula los horarios realmente libres para un profesional en una sede, '
  'en una fecha, para la duración del servicio dado. Cruza branch_schedules '
  '+ professional_schedules + schedule_exceptions + appointments no '
  'canceladas. No expone ninguna fila cruda de esas tablas, solo horas.';

revoke all on function public.get_available_slots(uuid, uuid, uuid, date) from public;
grant execute on function public.get_available_slots(uuid, uuid, uuid, date) to anon, authenticated;
