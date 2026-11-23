-- =============================================================================
-- Proteger el rol admin_global (spec 11.1)
-- =============================================================================
-- - Nadie desactiva su propia cuenta.
-- - No se desactiva ni se cambia el rol de la última admin_global activa:
--   sin ella nadie podría administrar sedes, especialidades ni cuentas.
-- La creación de admin_global desde la app la rechaza create-internal-user
-- (403); se crea desde Supabase (README, "Crear una administradora global").
--
-- El SQL Editor (sin auth.uid()) sí puede desactivarse a sí mismo, pero no
-- dejar a la clínica sin admin_global activa.
--
-- Se puede correr dos veces sin error.
-- =============================================================================

create or replace function public.protect_admin_global()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.id = auth.uid() and old.active and not new.active then
    raise exception 'No puedes desactivar tu propia cuenta.'
      using errcode = 'P0001';
  end if;

  if old.role = 'admin_global'
     and old.active
     and (not new.active or new.role <> 'admin_global')
     and not exists (
       select 1 from public.profiles p
       where p.role = 'admin_global' and p.active and p.id <> old.id
     ) then
    raise exception 'No se puede desactivar ni cambiar el rol de la última administradora global activa.'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

revoke all on function public.protect_admin_global() from public;

drop trigger if exists protect_admin_global on public.profiles;
create trigger protect_admin_global
  before update of active, role on public.profiles
  for each row
  execute function public.protect_admin_global();
