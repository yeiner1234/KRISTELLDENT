-- =============================================================================
-- Una administradora de sede administra una sola sede
-- =============================================================================
-- user_branch_access de una admin_sede es lo que le da permisos de
-- administración sobre una sede. Desde ahora tiene como máximo una fila. La
-- pantalla (Equipo) y create-internal-user ya lo piden; este trigger es la
-- garantía en la base.
--
-- Para cambiarla de sede, la app primero quita la sede actual y luego agrega
-- la nueva (setMemberBranches), así que el trigger no lo impide.
--
-- No toca datos existentes. Administradoras que hoy tienen varias sedes
-- (córrela antes; decide cuál dejar a cada una desde Equipo → Editar sedes):
--
--   select p.full_name, p.email, array_agg(b.name order by b.name) as sedes
--   from public.profiles p
--   join public.user_branch_access uba on uba.user_id = p.id
--   join public.branches b on b.id = uba.branch_id
--   where p.role = 'admin_sede'
--   group by p.id, p.full_name, p.email
--   having count(*) > 1;
--
-- Se puede correr dos veces sin error.
-- =============================================================================

create or replace function public.enforce_admin_sede_single_branch()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.profiles p where p.id = new.user_id and p.role = 'admin_sede')
     and exists (
       select 1 from public.user_branch_access uba
       where uba.user_id = new.user_id and uba.branch_id <> new.branch_id
     ) then
    raise exception 'Una administradora de sede administra una sola sede: quita la actual antes de asignarle otra.'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

revoke all on function public.enforce_admin_sede_single_branch() from public;

drop trigger if exists enforce_admin_sede_single_branch on public.user_branch_access;
create trigger enforce_admin_sede_single_branch
  before insert or update on public.user_branch_access
  for each row
  execute function public.enforce_admin_sede_single_branch();
