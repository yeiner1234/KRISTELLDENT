-- =============================================================================
-- Correo de contacto de cada cita.
--
-- Los correos de una cita (confirmación al reservar, aviso de reprogramación
-- o cancelación y recordatorio) van al correo que se escribió al reservarla,
-- no al registrado del DNI: si alguien reserva con un DNI que ya tenía otro
-- correo, es quien reserva el que debe recibirlos.
--
-- La llena create-public-appointment al crear la cita. Las citas anteriores
-- quedan en null y siguen usando el correo registrado del paciente
-- (notificationRecipient en appointment-emails).
--
-- Se puede correr dos veces sin error.
-- =============================================================================

alter table public.appointments
  add column if not exists contact_email text;

comment on column public.appointments.contact_email is
  'Correo escrito al reservar la cita. Recibe la confirmación, los avisos y el recordatorio de esta cita (null en citas antiguas: se usa patients.email).';

-- =============================================================================
-- COMPROBACIÓN: reservar con un DNI ya registrado y otro correo →
--   select appointment_code, contact_email from public.appointments order by created_at desc limit 1;
-- contact_email es el correo escrito y la confirmación llega ahí.
-- =============================================================================
