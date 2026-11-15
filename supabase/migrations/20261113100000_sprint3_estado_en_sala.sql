-- =============================================================================
-- Sprint 3 · Estado "en sala" (in_room)
-- =============================================================================
-- Va en su propio archivo: Postgres no permite usar un valor de enum dentro de
-- la misma transacción en que se agrega. La migración siguiente
-- (20261113100100_sprint3_base_permisos.sql) ya puede usar 'in_room'.
--
-- En la base de producción el enum de appointments.status se renombró a mano a
-- public.estado_cita (mismos valores), aunque el historial registra
-- 20260918205136_patients_appointments.sql, que lo crea como
-- public.appointment_status. Aquí se le devuelve el nombre del repo. Renombrar
-- no toca columnas, restricciones, políticas ni vistas: Postgres las enlaza por
-- OID. Solo afectaría a una función que escriba 'estado_cita' en su código
-- (ver la consulta previa en el plan).
-- =============================================================================

do $$
begin
  if exists (
       select 1 from pg_type t
       join pg_namespace n on n.oid = t.typnamespace
       where n.nspname = 'public' and t.typname = 'estado_cita'
     )
     and not exists (
       select 1 from pg_type t
       join pg_namespace n on n.oid = t.typnamespace
       where n.nspname = 'public' and t.typname = 'appointment_status'
     ) then
    alter type public.estado_cita rename to appointment_status;
  end if;
end;
$$;

alter type public.appointment_status add value if not exists 'in_room' after 'confirmed';
