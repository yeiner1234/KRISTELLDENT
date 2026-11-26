-- =============================================================================
-- HU13 + HU14: correos al reprogramar o cancelar una cita, y recordatorios
-- 24 horas antes.
--
-- - appointment_email_outbox: bandeja de avisos. El trigger
--   enqueue_appointment_email deja una fila cuando una cita se reprograma
--   (cambia fecha u hora) o se cancela, venga el cambio del paciente (Edge
--   Function patient-appointments) o del personal (panel / RPC). Así ningún
--   camino se queda sin correo.
-- - El mismo trigger avisa sin esperar (pg_net) a la Edge Function
--   appointment-emails, y pg_cron la llama cada 10 minutos: reintenta los
--   avisos que fallaron y envía los recordatorios (HU14).
-- - scheduled_at: cuándo se reservó o reprogramó la cita por última vez
--   (caso límite 2 de HU14: no recordar si fue con menos de 24 h).
--   reminder_sent_at: el recordatorio ya salió. Reprogramar reinicia ambos.
--
-- Configuración (una vez, en el SQL Editor; no va en esta migración porque
-- son secretos):
--   select vault.create_secret('https://<ref>.supabase.co/functions/v1/appointment-emails', 'appointment_emails_url');
--   select vault.create_secret('<secreto largo al azar>', 'appointment_emails_secret');
-- y el mismo secreto en la función:
--   npx supabase secrets set APPOINTMENT_EMAILS_SECRET=<secreto largo al azar>
-- Sin esos secretos no se llama a nada: las citas se guardan igual y los
-- avisos esperan en la bandeja.
--
-- Se puede correr dos veces sin error.
-- =============================================================================

create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;

-- -----------------------------------------------------------------------------
-- 1. Columnas del recordatorio
-- -----------------------------------------------------------------------------
alter table public.appointments
  add column if not exists scheduled_at timestamptz not null default now(),
  add column if not exists reminder_sent_at timestamptz;

comment on column public.appointments.scheduled_at is
  'Cuándo se reservó o reprogramó la cita por última vez (HU14: sin recordatorio si fue con menos de 24 h).';
comment on column public.appointments.reminder_sent_at is
  'Cuándo salió el recordatorio de 24 h (HU14). Se reinicia al reprogramar.';

-- Las citas que ya existían cuentan desde que se crearon. Solo pendientes y
-- confirmadas: guard_appointment_changes no deja tocar atendidas ni
-- canceladas (y a esas no se les recuerda nada).
update public.appointments
   set scheduled_at = created_at
 where status in ('pending', 'confirmed')
   and scheduled_at > created_at
   and reminder_sent_at is null;

create index if not exists idx_appointments_reminder_pending
  on public.appointments (appointment_date)
  where reminder_sent_at is null and status in ('pending', 'confirmed');

-- Reprogramar = reservar de nuevo para el recordatorio.
create or replace function public.reset_appointment_reminder()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (new.appointment_date, new.start_time) is distinct from (old.appointment_date, old.start_time) then
    new.scheduled_at := now();
    new.reminder_sent_at := null;
  end if;
  return new;
end;
$$;

revoke all on function public.reset_appointment_reminder() from public;

drop trigger if exists reset_appointment_reminder on public.appointments;
create trigger reset_appointment_reminder
  before update on public.appointments
  for each row
  execute function public.reset_appointment_reminder();

-- -----------------------------------------------------------------------------
-- 2. Bandeja de avisos (HU13)
-- -----------------------------------------------------------------------------
create table if not exists public.appointment_email_outbox (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments (id) on delete cascade,
  kind text not null check (kind in ('rescheduled', 'cancelled')),
  created_at timestamptz not null default now(),
  attempts integer not null default 0,
  processing_started_at timestamptz,
  sent_at timestamptz,
  last_error text
);

comment on table public.appointment_email_outbox is
  'Correos de cita reprogramada o cancelada pendientes de enviar (HU13). Solo la usa la Edge Function appointment-emails con service_role.';

create index if not exists idx_appointment_email_outbox_pending
  on public.appointment_email_outbox (created_at)
  where sent_at is null;

alter table public.appointment_email_outbox enable row level security;

revoke all on table public.appointment_email_outbox from anon, authenticated;
grant select, insert, update, delete on table public.appointment_email_outbox to service_role;

-- -----------------------------------------------------------------------------
-- 3. Llamada a la Edge Function (pg_net, sin esperar la respuesta)
-- -----------------------------------------------------------------------------
create or replace function public.invoke_appointment_emails()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url text;
  v_secret text;
begin
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'appointment_emails_url';
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'appointment_emails_secret';
  if v_url is null or v_secret is null then
    return;
  end if;

  perform net.http_post(
    url := v_url,
    body := '{}'::jsonb,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', v_secret)
  );
exception
  -- Un correo nunca debe impedir guardar la cita: pg_cron reintenta.
  when others then
    raise warning 'invoke_appointment_emails: %', sqlerrm;
end;
$$;

revoke all on function public.invoke_appointment_emails() from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- 4. Trigger que encola el aviso
-- -----------------------------------------------------------------------------
create or replace function public.enqueue_appointment_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_kind text;
begin
  if new.status = 'cancelled' and old.status is distinct from 'cancelled' then
    v_kind := 'cancelled';
  elsif new.status in ('pending', 'confirmed')
        and (new.appointment_date, new.start_time) is distinct from (old.appointment_date, old.start_time) then
    v_kind := 'rescheduled';
  else
    return null;
  end if;

  insert into public.appointment_email_outbox (appointment_id, kind) values (new.id, v_kind);
  perform public.invoke_appointment_emails();
  return null;
end;
$$;

revoke all on function public.enqueue_appointment_email() from public, anon, authenticated;

drop trigger if exists enqueue_appointment_email on public.appointments;
create trigger enqueue_appointment_email
  after update on public.appointments
  for each row
  execute function public.enqueue_appointment_email();

-- -----------------------------------------------------------------------------
-- 5. pg_cron: cada 10 minutos (recordatorios y reintentos)
-- -----------------------------------------------------------------------------
select cron.unschedule(jobid) from cron.job where jobname = 'appointment-emails';
select cron.schedule('appointment-emails', '*/10 * * * *', 'select public.invoke_appointment_emails();');

-- =============================================================================
-- COMPROBACIÓN (manual, con una cita de prueba):
--   update public.appointments set status = 'cancelled' where id = '<id>';
--   select kind, attempts, sent_at, last_error
--     from public.appointment_email_outbox order by created_at desc limit 1;
--   -- kind = cancelled y, segundos después, sent_at lleno.
--   select jobname, schedule from cron.job where jobname = 'appointment-emails';
--   select id, status_code, content from net._http_response order by created desc limit 5;
-- =============================================================================
