-- =============================================================================
-- Cuenta y ficha de una profesional, por separado
-- =============================================================================
-- Una profesional sale en la reserva solo si su CUENTA (profiles.active, se
-- cambia en Equipo) y su FICHA (professionals.active, se cambia en
-- Profesionales) están activas. Antes:
--   - Servicios decía "(desactivada)" sin aclarar cuál de las dos.
--   - Profesionales dejaba activar la ficha con la cuenta desactivada: la
--     tarjeta decía "Activo" y la reserva no la mostraba (PRUEBA Especialista B).
--
-- Ahora:
--   1. get_branch_offer_status devuelve por profesional account_active y
--      record_active, y el motivo dice si falta la cuenta o la ficha. Incluye
--      los cambios de 20261124000800_motivo_oferta_preciso.sql.
--   2. guard_professional_active rechaza activar la ficha si la cuenta está
--      desactivada. Equipo activa primero la cuenta y luego la ficha, así que
--      sigue funcionando.
--
-- Se puede correr dos veces sin error.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. Estado de la oferta de una sede
-- -----------------------------------------------------------------------------
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
      (p.active and pr.active) as is_active,
      exists (
        select 1 from public.professional_schedules sch
        where sch.professional_id = ps.professional_id and sch.branch_id = ps.branch_id
      ) as has_schedule
    from public.professional_services ps
    join public.professionals p on p.id = ps.professional_id
    join public.profiles pr on pr.id = ps.professional_id
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
      when not a.any_active then 'No visible en reservas: ninguna profesional asignada tiene la cuenta y la ficha activas.'
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
-- 2. No activar la ficha con la cuenta desactivada
-- -----------------------------------------------------------------------------
-- Igual que en 20261124000000_oferta_sede_estructura.sql, más la regla nueva,
-- que vale también sin sesión (SQL Editor, Edge Functions).
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

  if new.active and not old.active
     and not exists (select 1 from public.profiles pr where pr.id = new.id and pr.active) then
    raise exception 'La cuenta de esta profesional está desactivada: actívala primero en Equipo.'
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
-- Verificación (en el SQL Editor, después de aplicar):
-- -----------------------------------------------------------------------------
-- a) Con PRUEBA Especialista B (cuenta desactivada, ficha activa):
--      update public.professionals set active = false
--      where id = (select id from public.profiles where email = 'prueba.especialista.b@kristelldent.test');
--      update public.professionals set active = true
--      where id = (select id from public.profiles where email = 'prueba.especialista.b@kristelldent.test');
--    El segundo update responde "La cuenta de esta profesional está
--    desactivada: actívala primero en Equipo." y la ficha queda desactivada.
-- b) Equipo → PRUEBA Especialista B → Activar: activa cuenta y ficha sin error.
