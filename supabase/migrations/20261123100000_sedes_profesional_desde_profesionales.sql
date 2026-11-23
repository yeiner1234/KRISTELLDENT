-- =============================================================================
-- Sedes de una profesional: una sola fuente (Profesionales)
-- =============================================================================
-- Antes la sede de una profesional vivía en dos tablas que nadie sincronizaba:
--   - professional_branches (Profesionales): dónde se reserva con ella.
--   - user_branch_access (Equipo): quién la gestiona; shares_branch_with()
--     y por lo tanto la RLS de profiles, professional_schedules, etc.
-- Con Jaén solo en Profesionales, el admin de Jaén no podía tocar su horario.
--
-- Ahora professional_branches es la fuente y este trigger copia cada alta y
-- cada baja a user_branch_access, solo para los roles profesionales
-- (especialista, odontologa_general: PROFESSIONAL_ROLES en el frontend).
-- Técnicas y administradoras siguen gestionándose en Equipo.
--
-- Seguridad: el trigger es SECURITY DEFINER y escribe en user_branch_access,
-- que antes solo escribía admin_global. Queda acotado por la política de
-- inserción de professional_branches: un admin_sede solo agrega a sus sedes
-- a una profesional con la que ya comparte sede (shares_branch_with).
--
-- La invitación desde Equipo sigue guardando la sede inicial en
-- user_branch_access: sin ella un admin_sede no podría crearle la ficha.
--
-- Se puede correr dos veces sin error.
-- =============================================================================

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

-- --- Copia inicial ------------------------------------------------------------
-- Toda sede de Profesionales pasa a Equipo. No borra nada.
insert into public.user_branch_access (user_id, branch_id)
select pb.professional_id, pb.branch_id
from public.professional_branches pb
join public.profiles p on p.id = pb.professional_id
where p.role::text in ('especialista', 'odontologa_general')
on conflict (user_id, branch_id) do nothing;

-- --- Casos al revés (decide cada uno) -----------------------------------------
-- Profesionales con acceso en Equipo a una sede donde NO atienden según
-- Profesionales. Esta migración no los toca. Para cada fila decide:
--   - si sí atiende ahí: agrégale la sede en Profesionales → Editar;
--   - si no: delete from public.user_branch_access where id = '<access_id>';
-- Una profesional recién invitada aparece aquí hasta que se le cree la ficha.
--
--   select uba.id as access_id, p.full_name, p.email, p.role, b.name as sede
--   from public.user_branch_access uba
--   join public.profiles p on p.id = uba.user_id
--   join public.branches b on b.id = uba.branch_id
--   where p.role::text in ('especialista', 'odontologa_general')
--     and not exists (
--       select 1 from public.professional_branches pb
--       where pb.professional_id = uba.user_id and pb.branch_id = uba.branch_id
--     )
--   order by p.full_name, b.name;
