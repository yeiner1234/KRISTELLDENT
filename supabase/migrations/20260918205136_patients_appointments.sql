-- =============================================================================
-- FASE 9 — Pacientes y citas
-- =============================================================================
-- Alcance: public.patients, public.appointments, y su administración desde
-- el panel (agenda/citas/pacientes del admin, ya con la UI escrita desde la
-- FASE 1, ahora conectada a datos reales).
--
-- Explícitamente fuera de alcance en esta migración:
--   - el motor de disponibilidad (calcular slots libres cruzando horarios +
--     citas ya reservadas) — próxima fase.
--   - la reserva pública real (el wizard sigue usando datos locales hasta
--     que exista una Edge Function seguirá para crear pacientes/citas sin
--     autenticación, con anti-colisión robusto) — fases "disponibilidad" y
--     "reserva sin colisiones" del roadmap.
--   - por eso esta migración NO agrega policies para el rol `anon`: la
--     creación pública de citas no está lista para escribir directo a estas
--     tablas todavía.
--
-- Decisión de diseño: appointments.branch_id se guarda directo en cada fila
-- (nunca se deriva de professional_branches más adelante), para que el
-- historial se mantenga correcto aunque el profesional cambie de sede.
--
-- No se insertan pacientes ni citas ficticias.
-- =============================================================================

create type public.appointment_status as enum ('pending', 'confirmed', 'completed', 'cancelled');

create table public.patients (
  id uuid primary key default gen_random_uuid(),
  dni text not null unique,
  first_name text not null,
  last_name text not null,
  email text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.patients is
  'Pacientes: nunca son auth.users ni profiles. No tienen cuenta ni '
  'contraseña; se identifican por DNI (único).';

-- service_id es nullable porque el wizard actual todavía no pide elegir un
-- servicio con precio (solo especialidad + profesional): se agregará el
-- NOT NULL cuando el wizard pida servicio explícitamente.
create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients (id) on delete restrict,
  professional_id uuid not null references public.professionals (id) on delete restrict,
  branch_id uuid not null references public.branches (id) on delete restrict,
  service_id uuid references public.services (id) on delete restrict,
  appointment_date date not null,
  start_time time not null,
  end_time time not null,
  status public.appointment_status not null default 'pending',
  reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_time > start_time),
  -- Salvaguarda mínima: nunca dos citas con el mismo profesional a la misma
  -- hora exacta. NO reemplaza el motor de disponibilidad de la fase
  -- siguiente: dos citas con horas de inicio distintas pero traslapadas
  -- (ej. 09:00–09:40 y 09:20–10:00) todavía no se rechazan aquí.
  unique (professional_id, appointment_date, start_time)
);

comment on table public.appointments is
  'Citas reales. branch_id se congela al crear la cita (no se deriva de '
  'professional_branches), para que el historial no cambie si el '
  'profesional se reasigna de sede más adelante.';

create index idx_appointments_patient_id on public.appointments (patient_id);
create index idx_appointments_professional_id on public.appointments (professional_id);
create index idx_appointments_branch_id on public.appointments (branch_id);
create index idx_appointments_date on public.appointments (appointment_date);
create index idx_appointments_status on public.appointments (status);

create trigger set_patients_updated_at
  before update on public.patients
  for each row
  execute function public.set_updated_at();

create trigger set_appointments_updated_at
  before update on public.appointments
  for each row
  execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.patients enable row level security;
alter table public.appointments enable row level security;

-- --- appointments --------------------------------------------------------------
create policy appointments_select_admin_global
  on public.appointments for select
  to authenticated
  using (public.is_admin_global());

create policy appointments_select_admin_sede
  on public.appointments for select
  to authenticated
  using (public.has_branch_access(branch_id));

create policy appointments_select_own_professional
  on public.appointments for select
  to authenticated
  using (professional_id = auth.uid());

create policy appointments_insert_admin
  on public.appointments for insert
  to authenticated
  with check (public.is_admin_global() or public.has_branch_access(branch_id));

create policy appointments_update_admin
  on public.appointments for update
  to authenticated
  using (public.is_admin_global() or public.has_branch_access(branch_id) or professional_id = auth.uid())
  with check (public.is_admin_global() or public.has_branch_access(branch_id) or professional_id = auth.uid());

-- Sin policy de DELETE: una cita se cancela (status = 'cancelled'), nunca
-- se borra — es un registro histórico.

-- --- patients --------------------------------------------------------------
-- Una sola policy cubre los 3 roles: como appointments ya filtra por su
-- propia RLS quién puede ver qué cita, "tengo una cita visible con este
-- paciente" ya implica el alcance correcto (admin_global ve todas, admin_sede
-- las de su sede, el profesional las suyas) sin repetir esa lógica aquí.
create policy patients_select_via_visible_appointments
  on public.patients for select
  to authenticated
  using (exists (select 1 from public.appointments a where a.patient_id = patients.id));

create policy patients_write_admin_global
  on public.patients for insert
  to authenticated
  with check (public.is_admin_global());

create policy patients_update_admin_global
  on public.patients for update
  to authenticated
  using (public.is_admin_global())
  with check (public.is_admin_global());

-- Sin policy de DELETE: dato histórico ligado a citas pasadas.

-- -----------------------------------------------------------------------------
-- Privilegios de tabla (sin anon: la creación pública aún no está lista)
-- -----------------------------------------------------------------------------
grant select, insert, update on public.patients to authenticated;
grant select, insert, update on public.appointments to authenticated;

grant all on public.patients to service_role;
grant all on public.appointments to service_role;
