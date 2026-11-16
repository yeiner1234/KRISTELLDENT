-- =============================================================================
-- HU12 — Reprogramar desde el panel solo dentro del horario del profesional
-- =============================================================================
-- Antes el panel reprogramaba con un UPDATE directo: solo la restricción de
-- exclusión impedía choques, pero nada impedía mover la cita fuera del horario
-- del profesional (caso límite 1). Ahora el panel llama a esta función.
--
-- SECURITY INVOKER: la lectura y el UPDATE pasan por la RLS de quien llama
-- (admin_global, admin_sede de la sede, la profesional dueña de la cita).
-- get_available_slots es SECURITY DEFINER y ya tiene grant a authenticated.
-- El trigger guard_appointment_changes sigue aplicando (solo se reprograma
-- una cita pendiente o confirmada).
--
-- Se puede correr dos veces sin error.

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
  v_duration integer;
begin
  select a.id, a.professional_id, a.branch_id, a.service_id
  into v_appointment
  from public.appointments a
  where a.id = p_appointment_id;

  if not found then
    raise exception 'No se encontró la cita o no tienes permiso para modificarla.'
      using errcode = 'P0001';
  end if;

  if v_appointment.service_id is null then
    v_duration := 30;
  else
    select s.duration_minutes into v_duration
    from public.services s
    where s.id = v_appointment.service_id;

    v_duration := coalesce(v_duration, 30);
  end if;

  if not exists (
    select 1
    from public.get_available_slots(
      v_appointment.professional_id,
      v_appointment.branch_id,
      v_appointment.service_id,
      p_date,
      p_appointment_id
    ) s
    where s.slot_start = p_start_time
  ) then
    raise exception 'Ese horario está fuera del horario libre del profesional.'
      using errcode = 'P0001';
  end if;

  update public.appointments
  set appointment_date = p_date,
      start_time = p_start_time,
      end_time = p_start_time + make_interval(mins => v_duration)
  where id = p_appointment_id;

  if not found then
    raise exception 'No se encontró la cita o no tienes permiso para modificarla.'
      using errcode = 'P0001';
  end if;
end;
$$;

revoke all on function public.reschedule_appointment(uuid, date, time) from public, anon;
grant execute on function public.reschedule_appointment(uuid, date, time) to authenticated;
