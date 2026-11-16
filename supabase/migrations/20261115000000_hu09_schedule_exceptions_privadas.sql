-- =============================================================================
-- HU09 — schedule_exceptions deja de ser pública
-- =============================================================================
-- schedule_exceptions_select_public dejaba a anon leer todas las excepciones
-- de sedes y profesionales activos, motivos incluidos ("licencia médica",
-- "trámite personal"...). El público no las necesita: get_available_slots es
-- SECURITY DEFINER y ya resta las excepciones devolviendo solo horas.
--
-- Se mantienen schedule_exceptions_select_admin y las de escritura.
-- Se puede correr dos veces sin error.
-- =============================================================================

drop policy if exists schedule_exceptions_select_public on public.schedule_exceptions;

revoke select on public.schedule_exceptions from anon;
