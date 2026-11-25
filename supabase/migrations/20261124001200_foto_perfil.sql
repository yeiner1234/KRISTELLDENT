-- =============================================================================
-- Foto de perfil del personal
-- =============================================================================
-- Cualquier cuenta interna puede tener foto (profiles.avatar_path). Se guarda
-- en el bucket público "avatars" como <id de la cuenta>/<marca de tiempo>.jpg:
-- cada foto nueva tiene otra ruta, así el navegador no muestra la vieja.
--
-- Quién la cambia (can_manage_profile_photo):
--   - la propia persona;
--   - admin_global, la de cualquiera;
--   - admin_sede, la de técnicas, especialistas y odontólogas generales que
--     trabajan en alguna de sus sedes (misma regla que set_account_active).
--
-- La reserva pública muestra la foto de las profesionales:
-- get_public_professionals devuelve además avatar_path.
--
-- El bucket es público (lectura por URL, sin sesión) porque las fotos de las
-- profesionales salen en la página principal. Las rutas llevan el id (uuid) de
-- la cuenta, no el nombre.
--
-- Se puede correr dos veces sin error.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. Columna
-- -----------------------------------------------------------------------------
alter table public.profiles
  add column if not exists avatar_path text;

comment on column public.profiles.avatar_path is
  'Ruta de la foto de perfil en el bucket "avatars" (<id>/<marca>.jpg). '
  'null = sin foto. Se cambia solo con set_profile_avatar.';


-- -----------------------------------------------------------------------------
-- 2. Bucket
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;


-- -----------------------------------------------------------------------------
-- 3. Permisos
-- -----------------------------------------------------------------------------
create or replace function public.can_manage_profile_photo(p_user_id uuid)
returns boolean
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  v_target_role public.app_role;
begin
  if p_user_id is null or auth.uid() is null then
    return false;
  end if;

  if p_user_id = auth.uid() or public.is_admin_global() then
    return true;
  end if;

  if public.current_user_role() is distinct from 'admin_sede' then
    return false;
  end if;

  select role into v_target_role from public.profiles where id = p_user_id;
  if v_target_role is null or v_target_role not in ('tecnica', 'especialista', 'odontologa_general') then
    return false;
  end if;

  -- Sedes donde trabaja: accesos de Equipo y sedes de Profesionales.
  return exists (
    select 1
    from (
      select uba.branch_id from public.user_branch_access uba where uba.user_id = p_user_id
      union
      select pb.branch_id from public.professional_branches pb where pb.professional_id = p_user_id
    ) sedes
    where public.has_branch_access(sedes.branch_id)
  );
end;
$$;

comment on function public.can_manage_profile_photo(uuid) is
  'true si quien llama puede cambiar la foto de esa cuenta: ella misma, '
  'admin_global o la admin_sede de una sede donde trabaja (no otras admins).';

revoke all on function public.can_manage_profile_photo(uuid) from public, anon;
grant execute on function public.can_manage_profile_photo(uuid) to authenticated;

-- Dueña de un archivo del bucket: la primera carpeta de la ruta, si es un uuid.
create or replace function public.avatar_owner_from_path(p_name text)
returns uuid
language sql
immutable
set search_path = ''
as $$
  select case
    when split_part(p_name, '/', 1) ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
      then split_part(p_name, '/', 1)::uuid
  end;
$$;

revoke all on function public.avatar_owner_from_path(text) from public, anon;
grant execute on function public.avatar_owner_from_path(text) to authenticated;


-- -----------------------------------------------------------------------------
-- 4. Reglas del bucket (storage.objects)
-- -----------------------------------------------------------------------------
-- La lectura pública va por URL (bucket público). Para borrar una foto
-- Storage pide también poder leerla.
drop policy if exists avatars_select on storage.objects;
create policy avatars_select
  on storage.objects for select
  to authenticated
  using (bucket_id = 'avatars');

drop policy if exists avatars_insert on storage.objects;
create policy avatars_insert
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and public.can_manage_profile_photo(public.avatar_owner_from_path(name))
  );

drop policy if exists avatars_update on storage.objects;
create policy avatars_update
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and public.can_manage_profile_photo(public.avatar_owner_from_path(name))
  )
  with check (
    bucket_id = 'avatars'
    and public.can_manage_profile_photo(public.avatar_owner_from_path(name))
  );

drop policy if exists avatars_delete on storage.objects;
create policy avatars_delete
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and public.can_manage_profile_photo(public.avatar_owner_from_path(name))
  );


-- -----------------------------------------------------------------------------
-- 5. Guardar o quitar la foto
-- -----------------------------------------------------------------------------
-- Devuelve la ruta anterior para que la app borre el archivo viejo.
create or replace function public.set_profile_avatar(p_user_id uuid, p_path text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old text;
begin
  if p_user_id is null then
    raise exception 'Falta la cuenta.' using errcode = '22023';
  end if;

  if not public.can_manage_profile_photo(p_user_id) then
    raise exception 'No puedes cambiar la foto de esta persona.' using errcode = '42501';
  end if;

  if p_path is not null
     and (public.avatar_owner_from_path(p_path) is distinct from p_user_id or p_path like '%..%') then
    raise exception 'La ruta de la foto no es válida.' using errcode = '22023';
  end if;

  select avatar_path into v_old from public.profiles where id = p_user_id for update;
  if not found then
    raise exception 'No se encontró la cuenta.' using errcode = 'P0001';
  end if;

  update public.profiles set avatar_path = p_path where id = p_user_id;
  return v_old;
end;
$$;

comment on function public.set_profile_avatar(uuid, text) is
  'Guarda (o quita, con null) la foto de perfil de una cuenta. Mismos permisos '
  'que can_manage_profile_photo. Devuelve la ruta anterior.';

revoke all on function public.set_profile_avatar(uuid, text) from public, anon;
grant execute on function public.set_profile_avatar(uuid, text) to authenticated;


-- -----------------------------------------------------------------------------
-- 6. Reserva pública: nombre y foto de las profesionales activas
-- -----------------------------------------------------------------------------
-- Cambia lo que devuelve: hay que borrarla y crearla de nuevo.
drop function if exists public.get_public_professionals();

create function public.get_public_professionals()
returns table (id uuid, full_name text, avatar_path text)
language sql
security definer
stable
set search_path = ''
as $$
  select p.id, pr.full_name, pr.avatar_path
  from public.professionals p
  join public.profiles pr on pr.id = p.id
  where p.active = true and pr.active = true;
$$;

revoke all on function public.get_public_professionals() from public;
grant execute on function public.get_public_professionals() to anon, authenticated;


-- -----------------------------------------------------------------------------
-- Verificación (SQL Editor)
-- -----------------------------------------------------------------------------
-- a) Bucket creado y público:
--   select id, public, file_size_limit, allowed_mime_types from storage.buckets where id = 'avatars';
-- b) La web pública recibe la foto (avatar_path null hasta que alguien suba una):
--   select * from public.get_public_professionals();
-- c) Una técnica cambia su propia foto pero no la de otra persona (se deshace):
--   begin;
--   select set_config('request.jwt.claims', json_build_object('sub',
--     (select id from public.profiles where role = 'tecnica' limit 1), 'role', 'authenticated')::text, true);
--   set local role authenticated;
--   select public.can_manage_profile_photo((select id from public.profiles where role = 'tecnica' limit 1));     -- true
--   select public.can_manage_profile_photo((select id from public.profiles where role = 'admin_global' limit 1)); -- false
--   rollback;
-- d) Ruta ajena: set_profile_avatar(<mi id>, '<otro id>/x.jpg') responde "La ruta de la foto no es válida."
-- e) Prueba manual: sube una foto desde el panel; en Storage > avatars aparece
--    <id>/<marca>.jpg, y al cambiarla la anterior se borra.
