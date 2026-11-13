-- =============================================================================
-- Sprint 3 · Estado "en sala" (in_room)
-- =============================================================================
-- Va en su propio archivo: Postgres no permite usar un valor de enum dentro de
-- la misma transacción en que se agrega. La migración siguiente
-- (20261113100100_sprint3_base_permisos.sql) ya puede usar 'in_room'.
-- =============================================================================

alter type public.appointment_status add value if not exists 'in_room' after 'confirmed';
