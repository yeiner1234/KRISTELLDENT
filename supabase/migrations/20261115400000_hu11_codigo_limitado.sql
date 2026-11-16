-- =============================================================================
-- HU11 — Código de cita limitado a su propia cita
-- =============================================================================
-- Con DNI + código, el paciente ve y gestiona todas sus citas. Pero la reserva
-- pública no pide cuenta: cualquiera puede reservar con el DNI de otra persona
-- y recibir el código de esa cita nueva. Para que eso no abra las demás citas
-- del paciente, la Edge Function create-public-appointment marca
-- code_limited = true cuando el DNI ya existía y los nombres o el correo de la
-- reserva no coinciden con los registrados. Un código limitado solo da acceso
-- a su propia cita (Edge Function patient-appointments).
--
-- Las citas existentes y las creadas desde el panel quedan en false.
--
-- Se puede correr dos veces sin error.

alter table public.appointments
  add column if not exists code_limited boolean not null default false;

comment on column public.appointments.code_limited is
  'true: el código de esta cita solo da acceso a esta cita (se reservó con un '
  'DNI existente y datos que no coinciden con los registrados).';
