-- =============================================================================
-- FASE 6 — Catálogo clínico: especialidades y servicios
-- =============================================================================
-- Alcance: public.specialties, public.services.
-- Explícitamente fuera de alcance: professionals, professional_specialties,
-- professional_services, professional_branches, patients, appointments,
-- schedules, availability — eso pertenece a fases posteriores.
--
-- No se insertan especialidades ni servicios ficticios en esta migración.
-- =============================================================================

create table public.specialties (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.specialties is
  'Catálogo clínico de especialidades. Compartido entre sedes (no es una '
  'tabla por-sede). Sin datos ficticios: se cargan desde el panel admin.';

-- ON DELETE RESTRICT: un servicio nunca queda huérfano de especialidad; para
-- retirar una especialidad se usa active = false (baja lógica), no borrado.
create table public.services (
  id uuid primary key default gen_random_uuid(),
  specialty_id uuid not null references public.specialties (id) on delete restrict,
  name text not null,
  duration_minutes integer not null check (duration_minutes > 0),
  price numeric(10, 2) not null check (price >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.services is
  'Catálogo de servicios ofrecidos, cada uno ligado a una especialidad. '
  'La relación servicio↔profesional↔sede se modelará en una fase posterior '
  '(professional_services / professional_branches).';

create index idx_specialties_active on public.specialties (active);
create index idx_services_specialty_id on public.services (specialty_id);
create index idx_services_active on public.services (active);

create trigger set_specialties_updated_at
  before update on public.specialties
  for each row
  execute function public.set_updated_at();

create trigger set_services_updated_at
  before update on public.services
  for each row
  execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.specialties enable row level security;
alter table public.services enable row level security;

-- Lectura pública de lo activo: el paciente anónimo necesita ver el catálogo
-- para reservar, sin cuenta.
create policy specialties_select_public_active
  on public.specialties for select
  to anon, authenticated
  using (active = true);

create policy specialties_select_admin_global
  on public.specialties for select
  to authenticated
  using (public.is_admin_global());

create policy services_select_public_active
  on public.services for select
  to anon, authenticated
  using (active = true);

create policy services_select_admin_global
  on public.services for select
  to authenticated
  using (public.is_admin_global());

-- Escritura: el catálogo es compartido entre sedes, así que por ahora solo
-- admin_global lo administra (no es una tabla por-sede como branches).
-- Sin policy de DELETE: baja lógica vía active, nunca borrado físico.
create policy specialties_insert_admin_global
  on public.specialties for insert
  to authenticated
  with check (public.is_admin_global());

create policy specialties_update_admin_global
  on public.specialties for update
  to authenticated
  using (public.is_admin_global())
  with check (public.is_admin_global());

create policy services_insert_admin_global
  on public.services for insert
  to authenticated
  with check (public.is_admin_global());

create policy services_update_admin_global
  on public.services for update
  to authenticated
  using (public.is_admin_global())
  with check (public.is_admin_global());

-- -----------------------------------------------------------------------------
-- Privilegios de tabla
-- -----------------------------------------------------------------------------
grant select, insert, update, delete on public.specialties to authenticated;
grant select on public.specialties to anon;
grant select, insert, update, delete on public.services to authenticated;
grant select on public.services to anon;

-- service_role: solo se usa desde el servidor (Edge Functions futuras), pero
-- se otorga desde ya para no repetir el problema de la FASE 5.
grant all on public.specialties to service_role;
grant all on public.services to service_role;
