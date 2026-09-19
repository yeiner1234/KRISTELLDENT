-- =============================================================================
-- FASE 3 — Autenticación interna, roles y control multi-sede
-- =============================================================================
-- Alcance de esta migración:
--   - enum public.app_role
--   - public.profiles        (1:1 con auth.users)
--   - public.branches
--   - public.user_branch_access
--   - funciones auxiliares seguras para RLS (sin recursión)
--   - políticas RLS mínimas, sin "USING (true)"
--
-- Explícitamente fuera de alcance (fases posteriores):
--   professionals, professional_branches, specialties, services,
--   professional_services, patients, appointments, schedules, availability.
--
-- No se insertan usuarios, sedes ni datos de ningún tipo en esta migración.
-- =============================================================================

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- 1. ENUM DE ROLES
-- -----------------------------------------------------------------------------
-- "paciente" queda deliberadamente excluido: el paciente nunca es un usuario
-- autenticado de Supabase Auth, es una entidad de negocio independiente que se
-- modelará en una fase posterior (tabla `patients`), identificada por DNI.
create type public.app_role as enum ('admin_global', 'admin_sede', 'especialista', 'tecnica');

-- -----------------------------------------------------------------------------
-- 2. PROFILES (1:1 con auth.users)
-- -----------------------------------------------------------------------------
-- No existe columna password / password_hash: Supabase Auth es la única fuente
-- de autenticación. `id` es exactamente auth.users.id (misma UUID).
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  email text not null unique,
  phone text,
  role public.app_role not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is
  'Personal interno autenticado (admin_global, admin_sede, especialista, tecnica). '
  'No incluye pacientes. No existe registro público: toda fila se crea desde un '
  'flujo administrativo seguro (Edge Function + Auth Admin API con service_role, '
  'nunca desde el cliente).';
comment on column public.profiles.role is
  'Rol asignado exclusivamente por un flujo administrativo del servidor. '
  'Nunca debe derivarse de metadata enviada por el cliente ni ser editable por '
  'el propio usuario (ver ausencia deliberada de política UPDATE para el dueño '
  'de la fila).';

-- -----------------------------------------------------------------------------
-- 3. BRANCHES
-- -----------------------------------------------------------------------------
create table public.branches (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  address text not null,
  phone text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.branches is
  'Sedes físicas de la clínica. Sin datos ficticios: las 4 sedes reales se '
  'cargarán en un paso controlado posterior a esta migración.';

-- -----------------------------------------------------------------------------
-- 4. USER_BRANCH_ACCESS
-- -----------------------------------------------------------------------------
-- Deliberadamente no se usa profiles.branch_id: una persona puede necesitar
-- acceso a más de una sede (ej. un admin_sede que administra dos sucursales).
create table public.user_branch_access (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  branch_id uuid not null references public.branches (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, branch_id)
);

comment on table public.user_branch_access is
  'Asignación de sedes por usuario interno. Es la única fuente de verdad para '
  'determinar a qué sede(s) tiene acceso un admin_sede/especialista/tecnica. '
  'Escritura restringida a admin_global vía RLS (ver sección de policies): '
  'ningún admin_sede puede asignarse a sí mismo ni a terceros una sede nueva.';

-- -----------------------------------------------------------------------------
-- 5. ÍNDICES
-- -----------------------------------------------------------------------------
create index idx_profiles_role on public.profiles (role);
create index idx_profiles_active on public.profiles (active);
create index idx_branches_active on public.branches (active);
-- (user_id, branch_id) ya está cubierto por la UNIQUE constraint anterior
-- para búsquedas por user_id; branch_id necesita su propio índice.
create index idx_user_branch_access_branch_id on public.user_branch_access (branch_id);

-- -----------------------------------------------------------------------------
-- 6. updated_at AUTOMÁTICO
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();

create trigger set_branches_updated_at
  before update on public.branches
  for each row
  execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 7. FUNCIONES AUXILIARES PARA RLS (evitan recursión)
-- -----------------------------------------------------------------------------
-- Todas son SECURITY DEFINER: se ejecutan con los privilegios del dueño de la
-- función (propietario de las tablas), por lo que su consulta interna a
-- profiles / user_branch_access NO vuelve a evaluar las policies de esas
-- tablas (evita la recursión de RLS). Todas fijan search_path = '' y usan
-- nombres completamente calificados (public.xxx) para evitar hijacking de
-- search_path. Ninguna usa SQL dinámico. Cada una tiene una única
-- responsabilidad.

create or replace function public.current_user_role()
returns public.app_role
language sql
security definer
stable
set search_path = ''
as $$
  select role
  from public.profiles
  where id = auth.uid();
$$;

create or replace function public.is_admin_global()
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin_global'
      and active = true
  );
$$;

create or replace function public.has_branch_access(target_branch_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_branch_access
    where user_id = auth.uid()
      and branch_id = target_branch_id
  );
$$;

-- Permite que un admin_sede consulte los perfiles del personal que comparte
-- al menos una sede con él (su propio equipo), sin poder ver personal de
-- sedes que no le fueron asignadas.
create or replace function public.shares_branch_with(target_user_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_branch_access self_access
    join public.user_branch_access target_access
      on target_access.branch_id = self_access.branch_id
    where self_access.user_id = auth.uid()
      and target_access.user_id = target_user_id
  );
$$;

-- Se revoca el privilegio EXECUTE por defecto a PUBLIC y se otorga solo a
-- `authenticated`: usuarios anónimos (pacientes) nunca necesitan invocarlas.
revoke all on function public.current_user_role() from public;
revoke all on function public.is_admin_global() from public;
revoke all on function public.has_branch_access(uuid) from public;
revoke all on function public.shares_branch_with(uuid) from public;

grant execute on function public.current_user_role() to authenticated;
grant execute on function public.is_admin_global() to authenticated;
grant execute on function public.has_branch_access(uuid) to authenticated;
grant execute on function public.shares_branch_with(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- 8. ROW LEVEL SECURITY
-- -----------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.branches enable row level security;
alter table public.user_branch_access enable row level security;

-- --- profiles ----------------------------------------------------------------
-- SELECT: cada usuario ve su propia fila; admin_global ve todas; admin_sede
-- ve el personal que comparte sede con él.
create policy profiles_select_own
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

create policy profiles_select_admin_global
  on public.profiles for select
  to authenticated
  using (public.is_admin_global());

create policy profiles_select_admin_sede_staff
  on public.profiles for select
  to authenticated
  using (
    public.current_user_role() = 'admin_sede'
    and public.shares_branch_with(id)
  );

-- INSERT: deliberadamente SIN policy para ningún rol autenticado ni anónimo.
-- profiles.id depende de una fila previa en auth.users, que solo puede
-- crearse desde el servidor (Auth Admin API con service_role). Por lo tanto
-- la única vía de creación es una Edge Function futura que use service_role
-- (el cual bypassa RLS por completo). No hay ningún escenario legítimo en el
-- que el cliente autenticado deba insertar directamente en profiles.

-- UPDATE: solo admin_global. Al no existir policy de auto-actualización para
-- el dueño de la fila, ningún usuario puede modificar su propio `role` (ni
-- ningún otro campo) desde el cliente: la ausencia de policy es una denegación
-- por defecto en RLS.
create policy profiles_update_admin_global
  on public.profiles for update
  to authenticated
  using (public.is_admin_global())
  with check (public.is_admin_global());

-- DELETE: sin policy para nadie. Se prefiere baja lógica (`active = false`)
-- sobre borrado físico.

-- --- branches ------------------------------------------------------------------
-- SELECT: público (anon + authenticated) solo ve sedes activas, para que el
-- paciente pueda elegir sede al reservar sin necesitar cuenta.
create policy branches_select_public_active
  on public.branches for select
  to anon, authenticated
  using (active = true);

-- admin_global ve también las sedes inactivas (para poder reactivarlas).
create policy branches_select_admin_global
  on public.branches for select
  to authenticated
  using (public.is_admin_global());

-- El personal asignado a una sede puede verla aunque esté temporalmente
-- inactiva (ej. en mantenimiento).
create policy branches_select_assigned_staff
  on public.branches for select
  to authenticated
  using (public.has_branch_access(id));

-- INSERT/UPDATE: solo admin_global. Sin policy de DELETE (soft-delete vía
-- `active`).
create policy branches_insert_admin_global
  on public.branches for insert
  to authenticated
  with check (public.is_admin_global());

create policy branches_update_admin_global
  on public.branches for update
  to authenticated
  using (public.is_admin_global())
  with check (public.is_admin_global());

-- --- user_branch_access --------------------------------------------------------
-- SELECT: cada usuario ve sus propias asignaciones; admin_global ve todas;
-- admin_sede ve las asignaciones de su propio equipo (mismas sedes).
create policy user_branch_access_select_own
  on public.user_branch_access for select
  to authenticated
  using (user_id = auth.uid());

create policy user_branch_access_select_admin_global
  on public.user_branch_access for select
  to authenticated
  using (public.is_admin_global());

create policy user_branch_access_select_admin_sede_staff
  on public.user_branch_access for select
  to authenticated
  using (
    public.current_user_role() = 'admin_sede'
    and public.shares_branch_with(user_id)
  );

-- INSERT/DELETE: exclusivamente admin_global. Esta es la protección concreta
-- que exige la sección 10/11: un admin_sede jamás tiene una policy de
-- escritura sobre esta tabla, así que cualquier intento de asignarse (o
-- asignarle a un tercero) una sede adicional es rechazado por PostgreSQL a
-- nivel de RLS, sin importar qué envíe el cliente.
create policy user_branch_access_insert_admin_global
  on public.user_branch_access for insert
  to authenticated
  with check (public.is_admin_global());

create policy user_branch_access_delete_admin_global
  on public.user_branch_access for delete
  to authenticated
  using (public.is_admin_global());

-- Sin policy de UPDATE: para reasignar una sede se elimina la fila y se
-- inserta una nueva (la tabla no tiene columnas mutables más allá de las
-- llaves foráneas).

-- -----------------------------------------------------------------------------
-- 9. PRIVILEGIOS DE TABLA
-- -----------------------------------------------------------------------------
-- Los GRANT de tabla son una puerta necesaria pero no suficiente: RLS sigue
-- siendo la capa que decide qué filas/operaciones concretas se permiten.
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.branches to authenticated;
grant select on public.branches to anon;
grant select, insert, update, delete on public.user_branch_access to authenticated;
