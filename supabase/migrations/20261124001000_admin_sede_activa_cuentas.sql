-- =============================================================================
-- La admin de sede activa y desactiva cuentas de su sede
-- =============================================================================
-- Antes solo admin_global cambiaba profiles.active (política
-- profiles_update_admin_global). Ahora, con la función set_account_active:
--
--   admin_global: cualquier cuenta (siguen valiendo "nadie se desactiva a sí
--                 mismo" y "no quedarse sin admin_global", trigger
--                 protect_admin_global).
--   admin_sede:   cuentas de técnicas, especialistas y odontólogas generales
--                 que trabajan en su sede.
--                 - Activar: si trabaja en alguna de sus sedes.
--                 - Desactivar: solo si trabaja ÚNICAMENTE en sus sedes. La
--                   cuenta es una para todas las sedes: desactivarla la quita
--                   de la reserva en todas.
--
-- La cuenta y la ficha profesional se cambian juntas (al activar, primero la
-- cuenta: guard_professional_active no deja activar la ficha sin cuenta).
-- No se abre la política de update de profiles: la admin_sede solo puede
-- cambiar "active", y solo por esta función.
--
-- Requiere 20261124000900_estado_cuenta_y_ficha.sql.
-- Se puede correr dos veces sin error.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. guard_professional_active deja pasar el cambio hecho por set_account_active
-- -----------------------------------------------------------------------------
-- set_account_active marca la persona en app.account_toggle_id (solo dura la
-- transacción). Lo demás es igual a 20261124000900.
create or replace function public.guard_professional_active()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.active is distinct from old.active
     and auth.uid() is not null
     and not public.is_admin_global()
     and coalesce(current_setting('app.account_toggle_id', true), '') <> new.id::text then
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
-- 2. set_account_active
-- -----------------------------------------------------------------------------
create or replace function public.set_account_active(p_user_id uuid, p_active boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_role public.app_role := public.current_user_role();
  v_target_role public.app_role;
  v_target_branches uuid[];
begin
  if p_user_id is null or p_active is null then
    raise exception 'Faltan datos para cambiar la cuenta.' using errcode = '22023';
  end if;

  select role into v_target_role from public.profiles where id = p_user_id;
  if v_target_role is null then
    raise exception 'No se encontró la cuenta.' using errcode = 'P0001';
  end if;

  if v_caller_role is distinct from 'admin_global' then
    if v_caller_role is distinct from 'admin_sede' then
      raise exception 'No tienes permiso para activar o desactivar cuentas.' using errcode = '42501';
    end if;

    if v_target_role not in ('tecnica', 'especialista', 'odontologa_general') then
      raise exception 'Solo la administración general activa o desactiva cuentas de administradoras.'
        using errcode = '42501';
    end if;

    -- Sedes donde trabaja: accesos de Equipo y sedes de Profesionales.
    select coalesce(array_agg(distinct branch_id), '{}'::uuid[]) into v_target_branches
    from (
      select uba.branch_id from public.user_branch_access uba where uba.user_id = p_user_id
      union
      select pb.branch_id from public.professional_branches pb where pb.professional_id = p_user_id
    ) sedes;

    if not exists (select 1 from unnest(v_target_branches) b where public.has_branch_access(b)) then
      raise exception 'Esta persona no trabaja en tu sede.' using errcode = '42501';
    end if;

    if not p_active
       and exists (select 1 from unnest(v_target_branches) b where not public.has_branch_access(b)) then
      raise exception 'Atiende también en otra sede: solo la administración general puede desactivar su cuenta.'
        using errcode = '42501';
    end if;
  end if;

  perform set_config('app.account_toggle_id', p_user_id::text, true);

  -- protect_admin_global (trigger de profiles) sigue revisando "a sí mismo"
  -- y "última admin_global".
  update public.profiles set active = p_active where id = p_user_id;

  if v_target_role in ('especialista', 'odontologa_general') then
    update public.professionals set active = p_active where id = p_user_id;
  end if;

  perform set_config('app.account_toggle_id', '', true);
end;
$$;

comment on function public.set_account_active(uuid, boolean) is
  'Activa o desactiva una cuenta (y su ficha si es profesional). admin_global: '
  'cualquiera. admin_sede: técnicas y profesionales de su sede; desactivar solo '
  'si trabajan únicamente en sus sedes.';

revoke all on function public.set_account_active(uuid, boolean) from public, anon;
grant execute on function public.set_account_active(uuid, boolean) to authenticated;


-- -----------------------------------------------------------------------------
-- Verificación (SQL Editor). Cambia los correos por los reales.
-- -----------------------------------------------------------------------------
-- Como la admin de Chiclayo, en una transacción que se deshace:
--   begin;
--   select set_config('request.jwt.claims', json_build_object('sub',
--     (select id from public.profiles where full_name = 'ADMIN_SEDE_CIX'), 'role', 'authenticated')::text, true);
--   set local role authenticated;
--   -- a) Activar a PRUEBA Especialista B (Chiclayo y Jaén): funciona.
--   select public.set_account_active(
--     (select id from public.profiles where email = 'prueba.especialista.b@kristelldent.test'), true);
--   -- b) Desactivar a ANali (Chiclayo, Jaén y Bagua): "Atiende también en otra sede…".
--   select public.set_account_active(
--     (select id from public.profiles where email = 'yeineredinsonc@gmail.com'), false);
--   rollback;
