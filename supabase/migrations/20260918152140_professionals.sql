-- =============================================================================
-- FASE 7 — Profesionales y sus relaciones (sedes, especialidades, servicios)
-- =============================================================================
-- Alcance: public.professionals, professional_branches,
-- professional_specialties, professional_services.
-- Explícitamente fuera de alcance: patients, appointments, schedules,
-- schedule_exceptions, branch_schedules, availability — fases posteriores.
--
-- Decisión de diseño: professionals.id = profiles.id (1:1, misma UUID),
-- igual patrón que profiles → auth.users. Un "profesional" nunca existe sin
-- una cuenta interna real con role = 'especialista': no se duplica nombre/
-- correo aquí, esos datos siguen viviendo únicamente en profiles.
--
-- Las relaciones son muchos-a-muchos porque un especialista puede atender
-- en más de una sede, cubrir más de una especialidad, y ofrecer varios
-- servicios — exactamente el mismo motivo por el que user_branch_access no
-- usa profiles.branch_id.
--
-- No se insertan profesionales ni relaciones ficticias en esta migración.
-- =============================================================================

create table public.professionals (
  id uuid primary key references public.profiles (id) on delete cascade,
  bio text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.professionals is
  'Ficha profesional de un usuario interno con role = especialista. El '
  'nombre/correo se leen de profiles (mismo id); aquí solo vive lo propio '
  'del ejercicio profesional (bio, estado).';

create trigger set_professionals_updated_at
  before update on public.professionals
  for each row
  execute function public.set_updated_at();

create table public.professional_branches (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.professionals (id) on delete cascade,
  branch_id uuid not null references public.branches (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (professional_id, branch_id)
);

create table public.professional_specialties (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.professionals (id) on delete cascade,
  specialty_id uuid not null references public.specialties (id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (professional_id, specialty_id)
);

create table public.professional_services (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.professionals (id) on delete cascade,
  service_id uuid not null references public.services (id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (professional_id, service_id)
);

create index idx_professionals_active on public.professionals (active);
create index idx_professional_branches_branch_id on public.professional_branches (branch_id);
create index idx_professional_specialties_specialty_id on public.professional_specialties (specialty_id);
create index idx_professional_services_service_id on public.professional_services (service_id);

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.professionals enable row level security;
alter table public.professional_branches enable row level security;
alter table public.professional_specialties enable row level security;
alter table public.professional_services enable row level security;

-- --- professionals -------------------------------------------------------------
create policy professionals_select_public_active
  on public.professionals for select
  to anon, authenticated
  using (active = true);

create policy professionals_select_own
  on public.professionals for select
  to authenticated
  using (id = auth.uid());

create policy professionals_select_admin_global
  on public.professionals for select
  to authenticated
  using (public.is_admin_global());

create policy professionals_select_admin_sede_staff
  on public.professionals for select
  to authenticated
  using (
    public.current_user_role() = 'admin_sede'
    and public.shares_branch_with(id)
  );

-- INSERT/UPDATE: admin_global siempre; admin_sede solo para un profesional
-- que ya comparte sede con él (es decir, alguien que él mismo ya invitó y
-- asignó a su sede vía user_branch_access). Reusa el mismo principio de
-- mínimo privilegio de la FASE 3.
create policy professionals_insert_admin
  on public.professionals for insert
  to authenticated
  with check (public.is_admin_global() or public.shares_branch_with(id));

create policy professionals_update_admin
  on public.professionals for update
  to authenticated
  using (public.is_admin_global() or public.shares_branch_with(id))
  with check (public.is_admin_global() or public.shares_branch_with(id));

-- Sin policy de DELETE: baja lógica vía active.

-- --- professional_branches / professional_specialties / professional_services ---
-- Mismo patrón en las tres: lectura pública si el profesional está activo,
-- lectura administrativa completa, escritura para admin_global o admin_sede
-- (solo sobre profesionales de su propia sede).
create policy professional_branches_select_public
  on public.professional_branches for select
  to anon, authenticated
  using (exists (select 1 from public.professionals p where p.id = professional_id and p.active = true));

create policy professional_branches_select_admin
  on public.professional_branches for select
  to authenticated
  using (public.is_admin_global() or public.shares_branch_with(professional_id));

create policy professional_branches_write_admin
  on public.professional_branches for insert
  to authenticated
  with check (public.is_admin_global() or public.shares_branch_with(professional_id));

create policy professional_branches_delete_admin
  on public.professional_branches for delete
  to authenticated
  using (public.is_admin_global() or public.shares_branch_with(professional_id));

create policy professional_specialties_select_public
  on public.professional_specialties for select
  to anon, authenticated
  using (exists (select 1 from public.professionals p where p.id = professional_id and p.active = true));

create policy professional_specialties_select_admin
  on public.professional_specialties for select
  to authenticated
  using (public.is_admin_global() or public.shares_branch_with(professional_id));

create policy professional_specialties_write_admin
  on public.professional_specialties for insert
  to authenticated
  with check (public.is_admin_global() or public.shares_branch_with(professional_id));

create policy professional_specialties_delete_admin
  on public.professional_specialties for delete
  to authenticated
  using (public.is_admin_global() or public.shares_branch_with(professional_id));

create policy professional_services_select_public
  on public.professional_services for select
  to anon, authenticated
  using (exists (select 1 from public.professionals p where p.id = professional_id and p.active = true));

create policy professional_services_select_admin
  on public.professional_services for select
  to authenticated
  using (public.is_admin_global() or public.shares_branch_with(professional_id));

create policy professional_services_write_admin
  on public.professional_services for insert
  to authenticated
  with check (public.is_admin_global() or public.shares_branch_with(professional_id));

create policy professional_services_delete_admin
  on public.professional_services for delete
  to authenticated
  using (public.is_admin_global() or public.shares_branch_with(professional_id));

-- -----------------------------------------------------------------------------
-- Privilegios de tabla
-- -----------------------------------------------------------------------------
grant select, insert, update, delete on public.professionals to authenticated;
grant select on public.professionals to anon;
grant select, insert, update, delete on public.professional_branches to authenticated;
grant select on public.professional_branches to anon;
grant select, insert, update, delete on public.professional_specialties to authenticated;
grant select on public.professional_specialties to anon;
grant select, insert, update, delete on public.professional_services to authenticated;
grant select on public.professional_services to anon;

grant all on public.professionals to service_role;
grant all on public.professional_branches to service_role;
grant all on public.professional_specialties to service_role;
grant all on public.professional_services to service_role;
