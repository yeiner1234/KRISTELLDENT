-- =============================================================================
-- Motivo preciso de "No visible en reservas"
-- =============================================================================
-- get_branch_offer_status decía "falta asignar una profesional" también cuando
-- sí había una asignada pero su cuenta o su ficha estaba desactivada. Ahora
-- distingue:
--   - nadie asignado                      → falta asignar una profesional.
--   - asignadas, todas desactivadas       → la profesional asignada está desactivada.
--   - activas, ninguna con horario aquí   → no tiene horario en esta sede.
--   - activas con horario, sin especialidad del servicio
--                                         → no tiene la especialidad de este servicio.
-- El resto es igual a 20261124000100_oferta_sede_funciones.sql.
--
-- Se puede correr dos veces sin error.
-- =============================================================================

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
          'has_schedule', ar.has_schedule,
          'bookable', exists (
            select 1 from pairs
            where pairs.service_id = ar.service_id and pairs.professional_id = ar.professional_id
          )
        )
        order by ar.full_name
      ) as professionals,
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
      when not a.any_active then 'No visible en reservas: la profesional asignada está desactivada.'
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
