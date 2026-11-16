-- =============================================================================
-- HU09 — Turnos extra por sede
-- =============================================================================
-- Un turno extra (is_available = true) de una profesional vale solo en la
-- sede donde se carga. Antes get_available_slots aplicaba las excepciones de
-- la profesional en todas sus sedes, sin mirar branch_id.
--
-- 1. get_available_slots: las excepciones de la profesional (ausencia de día
--    completo, ausencia parcial y turno extra) se aplican solo si branch_id
--    es null o igual a p_branch_id. Una ausencia sin sede sigue valiendo en
--    todas sus sedes. El resto es copia exacta de
--    20261113100100_sprint3_base_permisos.sql (misma firma, mismos grants).
-- 2. Restricción: un turno extra de una profesional debe llevar branch_id.
--    NOT VALID: no revisa filas viejas (si hubiera turnos extra sin sede,
--    siguen valiendo en todas sus sedes), solo las nuevas.
--
-- Se puede correr dos veces sin error.
-- =============================================================================

-- --- 1. Motor de disponibilidad ----------------------------------------------
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

  -- Ofrece ese servicio.
  if p_service_id is not null and not exists (
    select 1 from public.professional_services
    where professional_id = p_professional_id and service_id = p_service_id
  ) then
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
  'en una fecha (hora de Lima), para la duración del servicio dado. Cruza '
  'branch_schedules + professional_schedules + schedule_exceptions + '
  'appointments no canceladas (menos p_exclude_appointment_id). No expone '
  'ninguna fila cruda de esas tablas, solo horas.';

revoke all on function public.get_available_slots(uuid, uuid, uuid, date, uuid) from public;
grant execute on function public.get_available_slots(uuid, uuid, uuid, date, uuid) to anon, authenticated, service_role;

-- --- 2. Turno extra de una profesional = con sede -----------------------------
alter table public.schedule_exceptions
  drop constraint if exists schedule_exceptions_extra_shift_needs_branch;

alter table public.schedule_exceptions
  add constraint schedule_exceptions_extra_shift_needs_branch
  check (not (is_available and professional_id is not null and branch_id is null))
  not valid;
