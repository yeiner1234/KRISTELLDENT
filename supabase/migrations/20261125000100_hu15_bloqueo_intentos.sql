-- =============================================================================
-- HU15 caso límite 1: bloquear la consulta de citas 5 minutos tras 3 códigos
-- incorrectos para un DNI.
--
-- patient_access_failures guarda cada intento fallido (DNI + código que no
-- coinciden) de la Edge Function patient-appointments. La función cuenta los
-- fallos recientes con accessLockState (patientAppointments.ts) antes de
-- comprobar el código, y los borra cuando el paciente entra bien. Se registra
-- también para DNIs no registrados: el bloqueo no revela si el DNI existe
-- (caso límite 2).
--
-- Se puede correr dos veces sin error.
-- =============================================================================

create table if not exists public.patient_access_failures (
  id bigint generated always as identity primary key,
  dni text not null,
  failed_at timestamptz not null default now()
);

comment on table public.patient_access_failures is
  'Intentos fallidos de consultar citas por DNI (HU15). Solo la usa patient-appointments con service_role.';

create index if not exists idx_patient_access_failures_dni_failed_at
  on public.patient_access_failures (dni, failed_at desc);

alter table public.patient_access_failures enable row level security;

revoke all on table public.patient_access_failures from anon, authenticated;
grant select, insert, delete on table public.patient_access_failures to service_role;

-- =============================================================================
-- COMPROBACIÓN (manual): en /consultar-citas, 3 códigos incorrectos seguidos
-- para un mismo DNI → el 3.º responde "Demasiados intentos incorrectos…" y,
-- durante 5 minutos, también con el código correcto.
--   select dni, failed_at from public.patient_access_failures order by failed_at desc limit 5;
-- =============================================================================
