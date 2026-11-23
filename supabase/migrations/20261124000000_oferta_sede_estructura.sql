-- =============================================================================
-- Oferta autónoma por sede · 1 de 4 · Estructura, triggers y RLS
-- =============================================================================
-- Spec: docs/especificaciones/2026-11-23-oferta-autonoma-por-sede.md
-- (secciones 4, 5 y 7.2).
--
-- Requiere aplicadas antes:
--   20261123000000_sprint2_pendientes.sql
--   20261123100000_sedes_profesional_desde_profesionales.sql
--   20261123200000_comparte_sede_desde_profesionales.sql
--
-- Esta migración NO mueve datos: agrega columnas (services.branch_id queda
-- null), restricciones, triggers y políticas. El reparto de los servicios por
-- sede lo hace 20261124000200_oferta_sede_datos.sql. Los índices únicos por
-- nombre van en 20261124000300_oferta_sede_indices_nombre.sql.
--
-- Entre esta migración y la de datos, la reserva sigue funcionando igual:
-- las filas viejas tienen branch_id null y las FK compuestas no revisan filas
-- con null (MATCH SIMPLE).
--
-- Se puede correr dos veces sin error.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 0. Funciones auxiliares
-- -----------------------------------------------------------------------------
-- Clave de comparación de nombres: sin mayúsculas, tildes ni espacios de más.
-- "Rehabilitación  Oral" y "rehabilitacion oral" dan lo mismo.
create or replace function public.name_key(p_name text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select translate(lower(btrim(regexp_replace(p_name, '\s+', ' ', 'g'))), 'áéíóúüñ', 'aeiouun');
$$;

-- Rol de otra persona, para las políticas (un admin_sede no siempre puede
-- leer ese perfil por RLS).
create or replace function public.profile_role_of(target_user_id uuid)
returns public.app_role
language sql
security definer
stable
set search_path = ''
as $$
  select role from public.profiles where id = target_user_id;
$$;

revoke all on function public.profile_role_of(uuid) from public;
grant execute on function public.profile_role_of(uuid) to authenticated, service_role;

create or replace function public.professional_specialty_count(target_professional_id uuid)
returns integer
language sql
security definer
stable
set search_path = ''
as $$
  select count(*)::integer from public.professional_specialties where professional_id = target_professional_id;
$$;

revoke all on function public.professional_specialty_count(uuid) from public;
grant execute on function public.professional_specialty_count(uuid) to authenticated, service_role;


-- -----------------------------------------------------------------------------
-- 1. specialties: lista compartida
-- -----------------------------------------------------------------------------
alter table public.specialties
  add column if not exists created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  add column if not exists name_key text generated always as (public.name_key(name)) stored;

comment on column public.specialties.name_key is
  'Nombre normalizado (sin mayúsculas, tildes ni espacios de más) para impedir duplicados.';

-- El índice único llega en la migración 4; este trigger da el mensaje claro.
create or replace function public.specialties_unique_name()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.specialties s
    where s.name_key = public.name_key(new.name)
      and s.id <> new.id
  ) then
    raise exception 'Ya existe esa especialidad: elígela de la lista.'
      using errcode = '23505';
  end if;
  return new;
end;
$$;

revoke all on function public.specialties_unique_name() from public;

drop trigger if exists specialties_unique_name on public.specialties;
create trigger specialties_unique_name
  before insert or update of name on public.specialties
  for each row
  execute function public.specialties_unique_name();


-- -----------------------------------------------------------------------------
-- 2. services: cada servicio es de una sede
-- -----------------------------------------------------------------------------
alter table public.services
  add column if not exists branch_id uuid references public.branches (id) on delete restrict,
  add column if not exists name_key text generated always as (public.name_key(name)) stored,
  add column if not exists created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  add column if not exists updated_by uuid references public.profiles (id) on delete set null;

comment on column public.services.branch_id is
  'Sede dueña del servicio. Su precio y duración son los de esa sede. Null solo '
  'para servicios viejos sin uso que la migración dejó "sin sede".';

create index if not exists idx_services_branch_id on public.services (branch_id);

-- NOT VALID: no revisa servicios viejos; sí los nuevos y los que se editen.
alter table public.services drop constraint if exists services_duration_max;
alter table public.services
  add constraint services_duration_max check (duration_minutes <= 480) not valid;

-- Destino de la FK compuesta professional_services (branch_id, service_id).
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.services'::regclass and conname = 'services_branch_id_id_key'
  ) then
    alter table public.services add constraint services_branch_id_id_key unique (branch_id, id);
  end if;
end;
$$;

-- Un servicio activo necesita una especialidad activa (al crearlo, al cambiar
-- su especialidad o al activarlo).
create or replace function public.services_require_active_specialty()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.active
     and (tg_op = 'INSERT' or new.specialty_id is distinct from old.specialty_id or not old.active)
     and not exists (select 1 from public.specialties sp where sp.id = new.specialty_id and sp.active) then
    raise exception 'La especialidad elegida está desactivada.'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

revoke all on function public.services_require_active_specialty() from public;

drop trigger if exists services_require_active_specialty on public.services;
create trigger services_require_active_specialty
  before insert or update on public.services
  for each row
  execute function public.services_require_active_specialty();

-- Sede fija, nombre único en la sede y quién creó o editó.
create or replace function public.services_guard_branch_and_name()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Un servicio "sin sede" (migración) sí puede recibir una; después no cambia.
  if tg_op = 'UPDATE' and old.branch_id is not null and new.branch_id is distinct from old.branch_id then
    raise exception 'Un servicio no cambia de sede: crea uno nuevo en la otra sede.'
      using errcode = 'P0001';
  end if;

  if new.branch_id is not null
     and (tg_op = 'INSERT' or new.name is distinct from old.name or new.branch_id is distinct from old.branch_id)
     and exists (
       select 1 from public.services s
       where s.branch_id = new.branch_id
         and s.name_key = public.name_key(new.name)
         and s.id <> new.id
     ) then
    raise exception 'Esta sede ya tiene un servicio con ese nombre.'
      using errcode = '23505';
  end if;

  if auth.uid() is not null then
    if tg_op = 'INSERT' then
      new.created_by := auth.uid();
    else
      new.created_by := old.created_by;
      new.updated_by := auth.uid();
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.services_guard_branch_and_name() from public;

drop trigger if exists services_guard_branch_and_name on public.services;
create trigger services_guard_branch_and_name
  before insert or update on public.services
  for each row
  execute function public.services_guard_branch_and_name();


-- -----------------------------------------------------------------------------
-- 3. professional_branches: única fuente de las sedes de una profesional
-- -----------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.professional_branches'::regclass
      and contype = 'u'
      and pg_get_constraintdef(oid) = 'UNIQUE (professional_id, branch_id)'
  ) then
    alter table public.professional_branches
      add constraint professional_branches_professional_id_branch_id_key unique (professional_id, branch_id);
  end if;
end;
$$;

-- Copia de 20261123100000 (S2), por si esa migración no se aplicó: alta y
-- baja de una sede en Profesionales = alta y baja del acceso en Equipo, solo
-- para los roles profesionales.
create or replace function public.sync_professional_branch_access()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op in ('DELETE', 'UPDATE') and exists (
    select 1 from public.profiles p
    where p.id = old.professional_id
      and p.role::text in ('especialista', 'odontologa_general')
  ) then
    delete from public.user_branch_access
    where user_id = old.professional_id
      and branch_id = old.branch_id;
  end if;

  if tg_op in ('INSERT', 'UPDATE') and exists (
    select 1 from public.profiles p
    where p.id = new.professional_id
      and p.role::text in ('especialista', 'odontologa_general')
  ) then
    insert into public.user_branch_access (user_id, branch_id)
    values (new.professional_id, new.branch_id)
    on conflict (user_id, branch_id) do nothing;
  end if;

  return null;
end;
$$;

revoke all on function public.sync_professional_branch_access() from public;

drop trigger if exists sync_professional_branch_access on public.professional_branches;
create trigger sync_professional_branch_access
  after insert or update or delete on public.professional_branches
  for each row
  execute function public.sync_professional_branch_access();

-- Quitar a una profesional de una sede: no con citas pendientes; si se puede,
-- se van también su horario y sus ausencias o turnos extra de esa sede. Sus
-- servicios de esa sede se borran por la FK en cascada (sección 4).
create or replace function public.before_remove_professional_branch()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pending integer;
begin
  -- Borrado en cascada de la ficha completa: no hay nada que revisar.
  if not exists (select 1 from public.professionals p where p.id = old.professional_id) then
    return old;
  end if;

  select count(*) into v_pending
  from public.appointments a
  where a.professional_id = old.professional_id
    and a.branch_id = old.branch_id
    and a.status::text in ('pending', 'confirmed', 'in_room')
    and a.appointment_date >= (now() at time zone 'America/Lima')::date;

  if v_pending = 1 then
    raise exception 'Tiene 1 cita pendiente en esta sede: reprográmala o cancélala antes de quitarla.'
      using errcode = 'P0001';
  elsif v_pending > 1 then
    raise exception 'Tiene % citas pendientes en esta sede: reprográmalas o cancélalas antes de quitarla.', v_pending
      using errcode = 'P0001';
  end if;

  delete from public.professional_schedules
  where professional_id = old.professional_id and branch_id = old.branch_id;

  delete from public.schedule_exceptions
  where professional_id = old.professional_id and branch_id = old.branch_id;

  return old;
end;
$$;

revoke all on function public.before_remove_professional_branch() from public;

drop trigger if exists before_remove_professional_branch on public.professional_branches;
create trigger before_remove_professional_branch
  before delete on public.professional_branches
  for each row
  execute function public.before_remove_professional_branch();


-- -----------------------------------------------------------------------------
-- 4. professional_services: qué atiende cada profesional en cada sede
-- -----------------------------------------------------------------------------
alter table public.professional_services
  add column if not exists branch_id uuid,
  add column if not exists active boolean not null default true;

comment on column public.professional_services.branch_id is
  'Sede del servicio (copia de services.branch_id, la llena un trigger). La FK '
  'compuesta exige que la profesional atienda en esa sede.';

create index if not exists idx_professional_services_branch_id on public.professional_services (branch_id);

-- La app nunca escribe branch_id: sale del servicio.
create or replace function public.professional_services_set_branch()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select s.branch_id into new.branch_id from public.services s where s.id = new.service_id;

  if new.branch_id is null then
    raise exception 'Este servicio no tiene sede: asígnale una sede antes de asignarlo a una profesional.'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

revoke all on function public.professional_services_set_branch() from public;

drop trigger if exists professional_services_set_branch on public.professional_services;
create trigger professional_services_set_branch
  before insert or update on public.professional_services
  for each row
  execute function public.professional_services_set_branch();

alter table public.professional_services drop constraint if exists professional_services_professional_branch_fkey;
alter table public.professional_services
  add constraint professional_services_professional_branch_fkey
  foreign key (professional_id, branch_id)
  references public.professional_branches (professional_id, branch_id)
  on delete cascade;

alter table public.professional_services drop constraint if exists professional_services_branch_service_fkey;
alter table public.professional_services
  add constraint professional_services_branch_service_fkey
  foreign key (branch_id, service_id)
  references public.services (branch_id, id);

-- Cualificación: se reutiliza el trigger del S2 (20261123000000), con el
-- mensaje de la spec.
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
    raise exception 'La profesional no tiene la especialidad de este servicio.'
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

-- No se quita una especialidad que la profesional usa en alguna sede.
create or replace function public.prevent_specialty_removal_in_use()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.professionals p where p.id = old.professional_id) then
    return old;
  end if;

  if exists (
    select 1
    from public.professional_services ps
    join public.services s on s.id = ps.service_id
    where ps.professional_id = old.professional_id
      and ps.active
      and s.specialty_id = old.specialty_id
  ) then
    raise exception 'Primero quita sus servicios de esta especialidad en todas sus sedes.'
      using errcode = 'P0001';
  end if;

  return old;
end;
$$;

revoke all on function public.prevent_specialty_removal_in_use() from public;

drop trigger if exists prevent_specialty_removal_in_use on public.professional_specialties;
create trigger prevent_specialty_removal_in_use
  before delete on public.professional_specialties
  for each row
  execute function public.prevent_specialty_removal_in_use();


-- -----------------------------------------------------------------------------
-- 5. professionals: solo admin_global activa o desactiva la ficha completa
-- -----------------------------------------------------------------------------
-- Sin auth.uid() (SQL Editor, Edge Functions con service_role) no se revisa.
create or replace function public.guard_professional_active()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.active is distinct from old.active
     and auth.uid() is not null
     and not public.is_admin_global() then
    raise exception 'Solo la administradora global activa o desactiva la ficha completa. Para dejar de ofrecerla en tu sede, quítala de tu sede.'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

revoke all on function public.guard_professional_active() from public;

drop trigger if exists guard_professional_active on public.professionals;
create trigger guard_professional_active
  before update on public.professionals
  for each row
  execute function public.guard_professional_active();


-- -----------------------------------------------------------------------------
-- 6. appointments: copia del servicio al reservar o reprogramar
-- -----------------------------------------------------------------------------
alter table public.appointments
  add column if not exists service_name text,
  add column if not exists service_price numeric(10, 2),
  add column if not exists service_duration_minutes integer;

comment on column public.appointments.service_name is
  'Nombre del servicio al reservar o reprogramar: el historial no cambia si '
  'después se edita el servicio.';

-- Las funciones de reserva (create-public-appointment) y reprogramación
-- (reschedule_appointment, patient-appointments) solo escriben service_id,
-- fecha y hora: la copia la hace este trigger, así no hay forma de saltársela.
create or replace function public.appointments_copy_service()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.service_id is null then
    return new;
  end if;

  if tg_op = 'INSERT'
     or new.service_id is distinct from old.service_id
     or new.appointment_date is distinct from old.appointment_date
     or new.start_time is distinct from old.start_time then
    select s.name, s.price, s.duration_minutes
    into new.service_name, new.service_price, new.service_duration_minutes
    from public.services s
    where s.id = new.service_id;
  end if;

  return new;
end;
$$;

revoke all on function public.appointments_copy_service() from public;

drop trigger if exists appointments_copy_service on public.appointments;
create trigger appointments_copy_service
  before insert or update of service_id, appointment_date, start_time on public.appointments
  for each row
  execute function public.appointments_copy_service();


-- -----------------------------------------------------------------------------
-- 7. RLS (sección 7.2)
-- -----------------------------------------------------------------------------

-- --- specialties ---------------------------------------------------------------
-- anon sigue leyendo las activas (inicio público); el personal ve todas.
drop policy if exists specialties_select_authenticated on public.specialties;
create policy specialties_select_authenticated
  on public.specialties for select
  to authenticated
  using (true);

drop policy if exists specialties_insert_admin_global on public.specialties;
drop policy if exists specialties_insert_admin on public.specialties;
create policy specialties_insert_admin
  on public.specialties for insert
  to authenticated
  with check (
    (public.is_admin_global() or public.current_user_role() = 'admin_sede')
    and created_by = auth.uid()
  );

-- Renombrar y desactivar: solo admin_global (afecta a todas las sedes).
drop policy if exists specialties_update_admin_global on public.specialties;
create policy specialties_update_admin_global
  on public.specialties for update
  to authenticated
  using (public.is_admin_global())
  with check (public.is_admin_global());

-- Borrar: solo admin_global; las FK (services, professional_specialties) lo
-- impiden si algo la usa.
drop policy if exists specialties_delete_admin_global on public.specialties;
create policy specialties_delete_admin_global
  on public.specialties for delete
  to authenticated
  using (public.is_admin_global());

-- --- services ------------------------------------------------------------------
drop policy if exists services_select_authenticated on public.services;
create policy services_select_authenticated
  on public.services for select
  to authenticated
  using (true);

drop policy if exists services_insert_admin_global on public.services;
drop policy if exists services_insert_admin on public.services;
create policy services_insert_admin
  on public.services for insert
  to authenticated
  with check (
    public.is_admin_global()
    or (public.current_user_role() = 'admin_sede' and public.has_branch_access(branch_id))
  );

-- using + with check: un admin_sede no edita servicios de otra sede ni pasa
-- uno suyo a otra sede.
drop policy if exists services_update_admin_global on public.services;
drop policy if exists services_update_admin on public.services;
create policy services_update_admin
  on public.services for update
  to authenticated
  using (
    public.is_admin_global()
    or (public.current_user_role() = 'admin_sede' and public.has_branch_access(branch_id))
  )
  with check (
    public.is_admin_global()
    or (public.current_user_role() = 'admin_sede' and public.has_branch_access(branch_id))
  );

-- La FK de appointments (restrict) impide borrar un servicio con citas.
drop policy if exists services_delete_admin on public.services;
create policy services_delete_admin
  on public.services for delete
  to authenticated
  using (
    public.is_admin_global()
    or (public.current_user_role() = 'admin_sede' and public.has_branch_access(branch_id))
  );

-- --- professional_services ---------------------------------------------------
-- branch_id la llena el trigger antes de que se evalúe with check.
drop policy if exists professional_services_write_admin on public.professional_services;
create policy professional_services_write_admin
  on public.professional_services for insert
  to authenticated
  with check (
    public.is_admin_global()
    or (public.current_user_role() = 'admin_sede' and public.has_branch_access(branch_id))
  );

drop policy if exists professional_services_update_admin on public.professional_services;
create policy professional_services_update_admin
  on public.professional_services for update
  to authenticated
  using (
    public.is_admin_global()
    or (public.current_user_role() = 'admin_sede' and public.has_branch_access(branch_id))
  )
  with check (
    public.is_admin_global()
    or (public.current_user_role() = 'admin_sede' and public.has_branch_access(branch_id))
  );

drop policy if exists professional_services_delete_admin on public.professional_services;
create policy professional_services_delete_admin
  on public.professional_services for delete
  to authenticated
  using (
    public.is_admin_global()
    or (public.current_user_role() = 'admin_sede' and public.has_branch_access(branch_id))
  );

-- --- professional_branches ---------------------------------------------------
-- Ya no se exige compartir sede: una admin_sede suma a SU sede a una
-- profesional que hoy atiende en otra (la busca con
-- search_professionals_directory). Solo agrega o quita su propia sede.
drop policy if exists professional_branches_write_admin on public.professional_branches;
create policy professional_branches_write_admin
  on public.professional_branches for insert
  to authenticated
  with check (
    public.is_admin_global()
    or (public.current_user_role() = 'admin_sede' and public.has_branch_access(branch_id))
  );

drop policy if exists professional_branches_delete_admin on public.professional_branches;
create policy professional_branches_delete_admin
  on public.professional_branches for delete
  to authenticated
  using (
    public.is_admin_global()
    or (public.current_user_role() = 'admin_sede' and public.has_branch_access(branch_id))
  );

-- --- professional_specialties ------------------------------------------------
-- admin_sede: a una odontóloga general de su sede le agrega o quita
-- especialidades; a una especialista solo le pone la primera (cuando aún no
-- tiene ninguna). Cambiarla después es de admin_global, porque afecta a todas
-- sus sedes. El trigger prevent_specialty_removal_in_use impide quitar una
-- especialidad que se usa en otra sede.
drop policy if exists professional_specialties_write_admin on public.professional_specialties;
create policy professional_specialties_write_admin
  on public.professional_specialties for insert
  to authenticated
  with check (
    public.is_admin_global()
    or (
      public.current_user_role() = 'admin_sede'
      and public.shares_branch_with(professional_id)
      and (
        public.profile_role_of(professional_id) = 'odontologa_general'
        or (
          public.profile_role_of(professional_id) = 'especialista'
          and public.professional_specialty_count(professional_id) = 0
        )
      )
    )
  );

drop policy if exists professional_specialties_delete_admin on public.professional_specialties;
create policy professional_specialties_delete_admin
  on public.professional_specialties for delete
  to authenticated
  using (
    public.is_admin_global()
    or (
      public.current_user_role() = 'admin_sede'
      and public.shares_branch_with(professional_id)
      and public.profile_role_of(professional_id) = 'odontologa_general'
    )
  );

-- --- user_branch_access ------------------------------------------------------
-- Filas de profesionales: solo el trigger sync_professional_branch_access
-- (SECURITY DEFINER) y create-internal-user (service_role). Técnicas:
-- admin_global en cualquier sede; admin_sede solo sus sedes y solo técnicas
-- de su equipo. Administradoras: solo admin_global.
drop policy if exists user_branch_access_insert_admin_global on public.user_branch_access;
drop policy if exists user_branch_access_insert_admin on public.user_branch_access;
create policy user_branch_access_insert_admin
  on public.user_branch_access for insert
  to authenticated
  with check (
    (
      public.is_admin_global()
      and public.profile_role_of(user_id)::text not in ('especialista', 'odontologa_general')
    )
    or (
      public.current_user_role() = 'admin_sede'
      and public.profile_role_of(user_id) = 'tecnica'
      and public.has_branch_access(branch_id)
      and public.shares_branch_with(user_id)
    )
  );

drop policy if exists user_branch_access_delete_admin_global on public.user_branch_access;
drop policy if exists user_branch_access_delete_admin on public.user_branch_access;
create policy user_branch_access_delete_admin
  on public.user_branch_access for delete
  to authenticated
  using (
    (
      public.is_admin_global()
      and public.profile_role_of(user_id)::text not in ('especialista', 'odontologa_general')
    )
    or (
      public.current_user_role() = 'admin_sede'
      and public.profile_role_of(user_id) = 'tecnica'
      and public.has_branch_access(branch_id)
    )
  );
