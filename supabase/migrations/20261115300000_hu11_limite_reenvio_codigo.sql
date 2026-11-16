-- =============================================================================
-- HU11 — Límite de reenvío de códigos de cita por correo
-- =============================================================================
-- La Edge Function patient-appointments (acción 'resend-code') envía al correo
-- registrado los códigos de las próximas citas de un DNI. Para que nadie use
-- el formulario para llenar de correos a un paciente, se permiten como mucho
-- 3 pedidos por DNI por hora. Se registra cada pedido (exista o no el DNI,
-- para no revelar nada por la diferencia de comportamiento).
--
-- Solo la usa la Edge Function con service_role: RLS activo y sin policies,
-- así anon y authenticated no pueden leerla ni escribirla.
--
-- Se puede correr dos veces sin error.

create table if not exists public.patient_code_email_log (
  id bigint generated always as identity primary key,
  dni text not null check (dni ~ '^\d{8}$'),
  requested_at timestamptz not null default now()
);

comment on table public.patient_code_email_log is
  'Pedidos de reenvío de códigos de cita por DNI (límite de 3 por hora). '
  'Solo la escribe la Edge Function patient-appointments con service_role.';

create index if not exists idx_patient_code_email_log_dni_requested_at
  on public.patient_code_email_log (dni, requested_at desc);

alter table public.patient_code_email_log enable row level security;

revoke all on table public.patient_code_email_log from anon, authenticated;
grant select, insert, delete on table public.patient_code_email_log to service_role;
