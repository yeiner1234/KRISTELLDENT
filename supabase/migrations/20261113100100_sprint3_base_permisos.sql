-- =============================================================================
-- Sprint 3 · Base de datos y permisos
-- =============================================================================
-- Requiere 20261113100000_sprint3_estado_en_sala.sql aplicada antes (valor
-- 'in_room' del enum appointment_status).
--
-- Contenido:
--   2.0 current_user_role() solo para perfiles activos.
--   2.1 Código de cita (HU10/HU11).
--   2.2 Un paciente no puede tener dos citas que se crucen (HU10).
--   2.3 Reglas de cambio de estado y reprogramación (HU11, HU12).
--   2.4 Nombres públicos de profesionales (C1).
--   2.5 Citas visibles y editables según el rol (S1).
--   2.6 Escrituras de catálogo y horarios solo para admins (S2).
--   2.7 Motor de disponibilidad corregido (C6, HU09).
--
-- Se puede correr dos veces sin error: cada objeto se borra "if exists" antes
-- de crearse, o se crea con "if not exists" / "create or replace".
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 2.0 current_user_role() solo para perfiles activos
-- -----------------------------------------------------------------------------
-- Todas las políticas de admin_sede y tecnica dependen de esta función. Antes
-- devolvía el rol aunque el perfil estuviera desactivado, así que un usuario
-- desactivado con la sesión abierta seguía pudiendo leer y escribir. Ahora
-- devuelve null para un perfil inactivo (igual que is_admin_global()).
-- create or replace conserva los grants de la migración inicial.
create or replace function public.current_user_role()
returns public.app_role
language sql
security definer
stable
set search_path = ''
as $$
  select role
  from public.profiles
  where id = auth.uid()
    and active = true;
$$;

-- guard_appointment_changes (2.3) la llama con los permisos de quien actualiza.
-- Las Edge Functions actualizan como service_role: sin este grant el trigger
-- fallaría con "permission denied". Para service_role auth.uid() es null, así
-- que la función devuelve null.
grant execute on function public.current_user_role() to service_role;


-- -----------------------------------------------------------------------------
-- 2.1 Código de cita
-- -----------------------------------------------------------------------------
-- El código sirve como contraseña (el paciente reprograma y cancela con DNI +
-- código), así que no usa random(): toma 6 bytes de gen_random_uuid(), que sale
-- del generador criptográfico de Postgres. Son los bytes 0 a 5 del UUID v4, los
-- 48 bits sin los bits fijos de versión y variante. 256 es múltiplo de 32, así
-- que byte % 32 elige cada letra sin sesgo. No necesita pgcrypto.
--
-- SECURITY DEFINER para que la comprobación de "ya existe" vea todas las citas
-- (como función de invocador, RLS le ocultaría las de otras sedes). La
-- restricción unique es la garantía final ante una carrera.
create or replace function public.generate_appointment_code()
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_bytes bytea;
  v_code text;
begin
  loop
    v_bytes := decode(replace(gen_random_uuid()::text, '-', ''), 'hex');
    v_code := 'KD-';
    for i in 0..5 loop
      v_code := v_code || substr(v_alphabet, 1 + get_byte(v_bytes, i) % 32, 1);
    end loop;

    exit when not exists (select 1 from public.appointments where appointment_code = v_code);
  end loop;

  return v_code;
end;
$$;

-- Solo la usan los roles que insertan citas: el panel admin (authenticated) y
-- la Edge Function de reserva (service_role).
revoke all on function public.generate_appointment_code() from public, anon;
grant execute on function public.generate_appointment_code() to authenticated, service_role;

alter table public.appointments add column if not exists appointment_code text;

update public.appointments
set appointment_code = public.generate_appointment_code()
where appointment_code is null;

alter table public.appointments drop constraint if exists appointments_code_unique;

alter table public.appointments
  alter column appointment_code set default public.generate_appointment_code(),
  alter column appointment_code set not null,
  add constraint appointments_code_unique unique (appointment_code);

comment on column public.appointments.appointment_code is
  'Código legible de la cita (KD-XXXXXX) para que el paciente la identifique.';


-- -----------------------------------------------------------------------------
-- 2.2 Un paciente no puede tener dos citas que se crucen
-- -----------------------------------------------------------------------------
-- ANTES DE APLICAR: esta consulta debe devolver 0 filas. Si devuelve alguna,
-- cancela o mueve una de las dos citas (supabase/scripts/seed_test_data.sql
-- crea citas de prueba; revisa sobre todo esas).
--
--   select a.patient_id, a.id as cita_a, b.id as cita_b, a.appointment_date,
--          a.start_time as inicio_a, a.end_time as fin_a,
--          b.start_time as inicio_b, b.end_time as fin_b
--   from public.appointments a
--   join public.appointments b
--     on b.patient_id = a.patient_id
--    and b.id > a.id
--    and b.appointment_date = a.appointment_date
--    and b.start_time < a.end_time
--    and a.start_time < b.end_time
--   where a.status <> 'cancelled' and b.status <> 'cancelled'
--   order by a.appointment_date, a.start_time;
--
-- btree_gist ya se creó en 20260918210347_availability_engine.sql.
alter table public.appointments drop constraint if exists appointments_no_patient_overlap;

alter table public.appointments
  add constraint appointments_no_patient_overlap
  exclude using gist (
    patient_id with =,
    tsrange(appointment_date + start_time, appointment_date + end_time) with &&
  )
  where (status <> 'cancelled');


-- -----------------------------------------------------------------------------
-- 2.3 Reglas de estado
-- -----------------------------------------------------------------------------
create or replace function public.guard_appointment_changes()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_labels constant jsonb := jsonb_build_object(
    'pending', 'pendiente',
    'confirmed', 'confirmada',
    'in_room', 'en sala',
    'completed', 'completada',
    'cancelled', 'cancelada'
  );
begin
  if old.status in ('completed', 'cancelled') then
    raise exception 'La cita ya está %: no se puede modificar.', v_labels ->> old.status::text
      using errcode = 'P0001';
  end if;

  if new.status is distinct from old.status and not (
    (old.status = 'pending' and new.status in ('confirmed', 'in_room', 'cancelled'))
    or (old.status = 'confirmed' and new.status in ('in_room', 'cancelled'))
    or (old.status = 'in_room' and new.status in ('completed', 'cancelled'))
  ) then
    raise exception 'Una cita % no puede pasar a %.', v_labels ->> old.status::text, v_labels ->> new.status::text
      using errcode = 'P0001';
  end if;

  if (new.appointment_date, new.start_time, new.end_time, new.professional_id, new.branch_id)
       is distinct from
     (old.appointment_date, old.start_time, old.end_time, old.professional_id, old.branch_id)
     and old.status not in ('pending', 'confirmed') then
    raise exception 'Solo se puede reprogramar una cita pendiente o confirmada.'
      using errcode = 'P0001';
  end if;

  -- Paciente, servicio y motivo solo los cambian los admins. Las Edge
  -- Functions (service_role) no tienen rol: current_user_role() da null.
  if public.current_user_role() in ('tecnica', 'especialista', 'odontologa_general')
     and (new.patient_id, new.service_id, new.reason)
           is distinct from
         (old.patient_id, old.service_id, old.reason) then
    raise exception 'No tienes permiso para cambiar el paciente, el servicio ni el motivo de una cita.'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

revoke all on function public.guard_appointment_changes() from public;

drop trigger if exists guard_appointment_changes on public.appointments;

create trigger guard_appointment_changes
  before update on public.appointments
  for each row
  execute function public.guard_appointment_changes();


-- -----------------------------------------------------------------------------
-- 2.4 Nombres públicos de profesionales
-- -----------------------------------------------------------------------------
-- anon no puede leer profiles; esta función expone solo id y nombre de los
-- profesionales activos.
create or replace function public.get_public_professionals()
returns table (id uuid, full_name text)
language sql
security definer
stable
set search_path = ''
as $$
  select p.id, pr.full_name
  from public.professionals p
  join public.profiles pr on pr.id = p.id
  where p.active = true and pr.active = true;
$$;

revoke all on function public.get_public_professionals() from public;
grant execute on function public.get_public_professionals() to anon, authenticated;


-- -----------------------------------------------------------------------------
-- 2.5 Citas por rol
-- -----------------------------------------------------------------------------
-- La profesional ve sus citas (appointments_select_own_professional, sin
-- cambios); admin_sede y tecnica, las de su sede; admin_global, todas.
drop policy if exists appointments_select_admin_sede on public.appointments;
drop policy if exists appointments_select_branch_staff on public.appointments;

create policy appointments_select_branch_staff
  on public.appointments for select
  to authenticated
  using (
    public.current_user_role() in ('admin_sede', 'tecnica')
    and public.has_branch_access(branch_id)
  );

drop policy if exists appointments_update_admin on public.appointments;
drop policy if exists appointments_update_staff on public.appointments;

create policy appointments_update_staff
  on public.appointments for update
  to authenticated
  using (
    public.is_admin_global()
    or (public.current_user_role() in ('admin_sede', 'tecnica') and public.has_branch_access(branch_id))
    or (professional_id = auth.uid() and public.current_user_role() is not null)
  )
  with check (
    public.is_admin_global()
    or (public.current_user_role() in ('admin_sede', 'tecnica') and public.has_branch_access(branch_id))
    or (professional_id = auth.uid() and public.current_user_role() is not null)
  );

drop policy if exists appointments_insert_admin on public.appointments;

create policy appointments_insert_admin
  on public.appointments for insert
  to authenticated
  with check (
    public.is_admin_global()
    or (public.current_user_role() = 'admin_sede' and public.has_branch_access(branch_id))
  );


-- -----------------------------------------------------------------------------
-- 2.6 Escrituras de catálogo y horarios solo para admins
-- -----------------------------------------------------------------------------
-- Antes bastaba con compartir sede (has_branch_access / shares_branch_with),
-- así que una tecnica o una especialista también podían escribir.

-- --- Con branch_id ------------------------------------------------------------
-- professional_branches y professional_schedules piden además que el
-- profesional comparta sede con el admin: sin eso, un admin_sede podría
-- asignar a su sede (y ofrecer al público) a un profesional de otra sede.
drop policy if exists branch_schedules_write_admin on public.branch_schedules;
create policy branch_schedules_write_admin
  on public.branch_schedules for insert
  to authenticated
  with check (public.is_admin_global() or (public.current_user_role() = 'admin_sede' and public.has_branch_access(branch_id)));

drop policy if exists branch_schedules_update_admin on public.branch_schedules;
create policy branch_schedules_update_admin
  on public.branch_schedules for update
  to authenticated
  using (public.is_admin_global() or (public.current_user_role() = 'admin_sede' and public.has_branch_access(branch_id)))
  with check (public.is_admin_global() or (public.current_user_role() = 'admin_sede' and public.has_branch_access(branch_id)));

drop policy if exists branch_schedules_delete_admin on public.branch_schedules;
create policy branch_schedules_delete_admin
  on public.branch_schedules for delete
  to authenticated
  using (public.is_admin_global() or (public.current_user_role() = 'admin_sede' and public.has_branch_access(branch_id)));

drop policy if exists professional_branches_write_admin on public.professional_branches;
create policy professional_branches_write_admin
  on public.professional_branches for insert
  to authenticated
  with check (public.is_admin_global() or (public.current_user_role() = 'admin_sede' and public.has_branch_access(branch_id) and public.shares_branch_with(professional_id)));

drop policy if exists professional_branches_delete_admin on public.professional_branches;
create policy professional_branches_delete_admin
  on public.professional_branches for delete
  to authenticated
  using (public.is_admin_global() or (public.current_user_role() = 'admin_sede' and public.has_branch_access(branch_id) and public.shares_branch_with(professional_id)));

drop policy if exists professional_schedules_write_admin on public.professional_schedules;
create policy professional_schedules_write_admin
  on public.professional_schedules for insert
  to authenticated
  with check (public.is_admin_global() or (public.current_user_role() = 'admin_sede' and public.has_branch_access(branch_id) and public.shares_branch_with(professional_id)));

drop policy if exists professional_schedules_update_admin on public.professional_schedules;
create policy professional_schedules_update_admin
  on public.professional_schedules for update
  to authenticated
  using (public.is_admin_global() or (public.current_user_role() = 'admin_sede' and public.has_branch_access(branch_id) and public.shares_branch_with(professional_id)))
  with check (public.is_admin_global() or (public.current_user_role() = 'admin_sede' and public.has_branch_access(branch_id) and public.shares_branch_with(professional_id)));

drop policy if exists professional_schedules_delete_admin on public.professional_schedules;
create policy professional_schedules_delete_admin
  on public.professional_schedules for delete
  to authenticated
  using (public.is_admin_global() or (public.current_user_role() = 'admin_sede' and public.has_branch_access(branch_id) and public.shares_branch_with(professional_id)));

-- --- Sin branch_id (se mira si el profesional comparte sede con el admin) -----
drop policy if exists professionals_insert_admin on public.professionals;
create policy professionals_insert_admin
  on public.professionals for insert
  to authenticated
  with check (public.is_admin_global() or (public.current_user_role() = 'admin_sede' and public.shares_branch_with(id)));

drop policy if exists professionals_update_admin on public.professionals;
create policy professionals_update_admin
  on public.professionals for update
  to authenticated
  using (public.is_admin_global() or (public.current_user_role() = 'admin_sede' and public.shares_branch_with(id)))
  with check (public.is_admin_global() or (public.current_user_role() = 'admin_sede' and public.shares_branch_with(id)));

drop policy if exists professional_specialties_write_admin on public.professional_specialties;
create policy professional_specialties_write_admin
  on public.professional_specialties for insert
  to authenticated
  with check (public.is_admin_global() or (public.current_user_role() = 'admin_sede' and public.shares_branch_with(professional_id)));

drop policy if exists professional_specialties_delete_admin on public.professional_specialties;
create policy professional_specialties_delete_admin
  on public.professional_specialties for delete
  to authenticated
  using (public.is_admin_global() or (public.current_user_role() = 'admin_sede' and public.shares_branch_with(professional_id)));

drop policy if exists professional_services_write_admin on public.professional_services;
create policy professional_services_write_admin
  on public.professional_services for insert
  to authenticated
  with check (public.is_admin_global() or (public.current_user_role() = 'admin_sede' and public.shares_branch_with(professional_id)));

drop policy if exists professional_services_delete_admin on public.professional_services;
create policy professional_services_delete_admin
  on public.professional_services for delete
  to authenticated
  using (public.is_admin_global() or (public.current_user_role() = 'admin_sede' and public.shares_branch_with(professional_id)));

-- --- schedule_exceptions (de sede o de profesional) ---------------------------
drop policy if exists schedule_exceptions_write_admin on public.schedule_exceptions;
create policy schedule_exceptions_write_admin
  on public.schedule_exceptions for insert
  to authenticated
  with check (
    public.is_admin_global()
    or (
      public.current_user_role() = 'admin_sede'
      and (
        (branch_id is not null and public.has_branch_access(branch_id))
        or (professional_id is not null and public.shares_branch_with(professional_id))
      )
    )
  );

drop policy if exists schedule_exceptions_delete_admin on public.schedule_exceptions;
create policy schedule_exceptions_delete_admin
  on public.schedule_exceptions for delete
  to authenticated
  using (
    public.is_admin_global()
    or (
      public.current_user_role() = 'admin_sede'
      and (
        (branch_id is not null and public.has_branch_access(branch_id))
        or (professional_id is not null and public.shares_branch_with(professional_id))
      )
    )
  );


-- -----------------------------------------------------------------------------
-- 2.7 Motor de disponibilidad
-- -----------------------------------------------------------------------------
-- Copia de 20260918210347_availability_engine.sql con estos cambios:
--   - quinto parámetro p_exclude_appointment_id (reprogramar sin chocar
--     consigo misma);
--   - "hoy" y "ahora" en hora de Lima (Supabase corre en UTC);
--   - vacío si el profesional está inactivo, no atiende en la sede o no
--     ofrece el servicio;
--   - no ofrece horas que ya pasaron.
drop function if exists public.get_available_slots(uuid, uuid, uuid, date);

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
