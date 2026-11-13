-- =============================================================================
-- Quita can_request_password_reset
-- =============================================================================
-- La HU de recuperación de contraseña (Sprint 2) exige mostrar siempre el
-- mismo mensaje, esté o no registrado el correo. Esta función, aplicada a mano
-- en producción, permitía a cualquiera (anon) averiguar si un correo pertenece
-- al personal. main ya no la usa; el aviso de correo no registrado vive en la
-- rama feat/aviso-correo-no-registrado.
-- =============================================================================

drop function if exists public.can_request_password_reset(text);
