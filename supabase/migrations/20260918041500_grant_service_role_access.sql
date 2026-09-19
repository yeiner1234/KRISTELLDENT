-- =============================================================================
-- Corrección: otorgar privilegios de tabla a service_role
-- =============================================================================
-- service_role tiene BYPASSRLS a nivel de rol (salta las políticas de la
-- FASE 3), pero eso no reemplaza el GRANT de tabla — sin él, Postgres
-- rechaza la operación ANTES de siquiera evaluar RLS ("permission denied").
-- Esto solo lo usa el servidor (Edge Functions), nunca el navegador.
grant all on public.profiles to service_role;
grant all on public.branches to service_role;
grant all on public.user_branch_access to service_role;
