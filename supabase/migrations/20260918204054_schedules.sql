-- =============================================================================
-- FASE 8 — Horarios: branch_schedules, professional_schedules,
-- schedule_exceptions
-- =============================================================================
-- Alcance: las 3 tablas de horarios del esquema original, más los campos de
-- ubicación/contenido público que faltaban en branches para poder retirar
-- por completo el archivo local src/data/branches.ts (deuda marcada desde
-- la FASE 4: el badge "Abierta/Cerrada" del sitio público usaba un archivo
-- estático separado de la tabla real de Supabase, con IDs distintos —
-- ahora que professionals ya referencia public.branches (FASE 7), unificar
-- es indispensable para que un horario real tenga sentido en ambos lados).
--
-- Explícitamente fuera de alcance: el motor de disponibilidad (cálculo de
-- slots libres cruzando horarios + citas ya reservadas) — eso es la fase
-- siguiente. Aquí solo se modela DÓNDE vive el dato del horario.
--
-- No se insertan horarios, sedes ni excepciones ficticias.
-- =============================================================================

alter table public.branches
  add column if not exists region text,
  add column if not exists google_maps_address text,
  add column if not exists lat double precision,
  add column if not exists lng double precision;

-- day_of_week: 0 = domingo … 6 = sábado (mismo criterio que Date.getDay()
-- en el frontend, para no tener que traducir índices).
create table public.branch_schedules (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches (id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  open_time time not null,
  close_time time not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (branch_id, day_of_week),
  check (close_time > open_time)
);

comment on table public.branch_schedules is
  'Horario semanal recurrente por sede. Un día sin fila = cerrado ese día. '
  'Reemplaza el WeeklyHours estático que antes vivía en el frontend.';

create table public.professional_schedules (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.professionals (id) on delete cascade,
  branch_id uuid not null references public.branches (id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (professional_id, branch_id, day_of_week, start_time),
  check (end_time > start_time)
);

comment on table public.professional_schedules is
  'Horario semanal recurrente de un profesional en una sede específica '
  '(un mismo profesional puede tener horarios distintos por sede).';

create table public.schedule_exceptions (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid references public.professionals (id) on delete cascade,
  branch_id uuid references public.branches (id) on delete cascade,
  exception_date date not null,
  is_available boolean not null default false,
  start_time time,
  end_time time,
  reason text,
  created_at timestamptz not null default now(),
  check (professional_id is not null or branch_id is not null)
);

comment on table public.schedule_exceptions is
  'Excepciones puntuales a un horario recurrente: un profesional que falta '
  'un día concreto, una sede cerrada por feriado, o disponibilidad extra. '
  'Se asocia a professional_id, a branch_id, o a ambos.';

create index idx_professional_schedules_professional_id on public.professional_schedules (professional_id);
create index idx_professional_schedules_branch_id on public.professional_schedules (branch_id);
create index idx_schedule_exceptions_professional_id on public.schedule_exceptions (professional_id);
create index idx_schedule_exceptions_branch_id on public.schedule_exceptions (branch_id);
create index idx_schedule_exceptions_date on public.schedule_exceptions (exception_date);

create trigger set_branch_schedules_updated_at
  before update on public.branch_schedules
  for each row
  execute function public.set_updated_at();

create trigger set_professional_schedules_updated_at
  before update on public.professional_schedules
  for each row
  execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.branch_schedules enable row level security;
alter table public.professional_schedules enable row level security;
alter table public.schedule_exceptions enable row level security;

-- --- branch_schedules ------------------------------------------------------
create policy branch_schedules_select_public
  on public.branch_schedules for select
  to anon, authenticated
  using (exists (select 1 from public.branches b where b.id = branch_id and b.active = true));

create policy branch_schedules_select_admin
  on public.branch_schedules for select
  to authenticated
  using (public.is_admin_global() or public.has_branch_access(branch_id));

create policy branch_schedules_write_admin
  on public.branch_schedules for insert
  to authenticated
  with check (public.is_admin_global() or public.has_branch_access(branch_id));

create policy branch_schedules_update_admin
  on public.branch_schedules for update
  to authenticated
  using (public.is_admin_global() or public.has_branch_access(branch_id))
  with check (public.is_admin_global() or public.has_branch_access(branch_id));

create policy branch_schedules_delete_admin
  on public.branch_schedules for delete
  to authenticated
  using (public.is_admin_global() or public.has_branch_access(branch_id));

-- --- professional_schedules --------------------------------------------------
create policy professional_schedules_select_public
  on public.professional_schedules for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.professionals p
      join public.branches b on b.id = branch_id
      where p.id = professional_id and p.active = true and b.active = true
    )
  );

create policy professional_schedules_select_own
  on public.professional_schedules for select
  to authenticated
  using (professional_id = auth.uid());

create policy professional_schedules_select_admin
  on public.professional_schedules for select
  to authenticated
  using (public.is_admin_global() or public.shares_branch_with(professional_id));

create policy professional_schedules_write_admin
  on public.professional_schedules for insert
  to authenticated
  with check (public.is_admin_global() or public.shares_branch_with(professional_id));

create policy professional_schedules_update_admin
  on public.professional_schedules for update
  to authenticated
  using (public.is_admin_global() or public.shares_branch_with(professional_id))
  with check (public.is_admin_global() or public.shares_branch_with(professional_id));

create policy professional_schedules_delete_admin
  on public.professional_schedules for delete
  to authenticated
  using (public.is_admin_global() or public.shares_branch_with(professional_id));

-- --- schedule_exceptions ------------------------------------------------------
create policy schedule_exceptions_select_public
  on public.schedule_exceptions for select
  to anon, authenticated
  using (
    (branch_id is not null and exists (select 1 from public.branches b where b.id = branch_id and b.active = true))
    or (professional_id is not null and exists (select 1 from public.professionals p where p.id = professional_id and p.active = true))
  );

create policy schedule_exceptions_select_admin
  on public.schedule_exceptions for select
  to authenticated
  using (
    public.is_admin_global()
    or (branch_id is not null and public.has_branch_access(branch_id))
    or (professional_id is not null and public.shares_branch_with(professional_id))
  );

create policy schedule_exceptions_write_admin
  on public.schedule_exceptions for insert
  to authenticated
  with check (
    public.is_admin_global()
    or (branch_id is not null and public.has_branch_access(branch_id))
    or (professional_id is not null and public.shares_branch_with(professional_id))
  );

create policy schedule_exceptions_delete_admin
  on public.schedule_exceptions for delete
  to authenticated
  using (
    public.is_admin_global()
    or (branch_id is not null and public.has_branch_access(branch_id))
    or (professional_id is not null and public.shares_branch_with(professional_id))
  );

-- -----------------------------------------------------------------------------
-- Privilegios de tabla
-- -----------------------------------------------------------------------------
grant select, insert, update, delete on public.branch_schedules to authenticated;
grant select on public.branch_schedules to anon;
grant select, insert, update, delete on public.professional_schedules to authenticated;
grant select on public.professional_schedules to anon;
grant select, insert, update, delete on public.schedule_exceptions to authenticated;
grant select on public.schedule_exceptions to anon;

grant all on public.branch_schedules to service_role;
grant all on public.professional_schedules to service_role;
grant all on public.schedule_exceptions to service_role;
