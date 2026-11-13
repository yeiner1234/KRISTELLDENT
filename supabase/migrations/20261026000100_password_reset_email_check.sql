-- =============================================================================
-- Verificación previa a la recuperación de contraseña
-- =============================================================================
-- Supabase Auth responde "éxito" aunque el correo no exista (para no revelar
-- qué cuentas hay). Por decisión de producto, la pantalla "Recuperar
-- contraseña" ahora sí le dice al usuario si su correo no está registrado, así
-- que el cliente consulta esta función antes de llamar a resetPasswordForEmail.
--
-- Solo cuenta como registrado el personal con profile activo: una cuenta
-- desactivada desde "Equipo" tampoco recibe el enlace.
--
-- Contrapartida aceptada: cualquiera puede preguntar si un correo pertenece al
-- personal. La función devuelve solo un booleano (nunca nombre, rol ni sede).
-- =============================================================================

create or replace function public.can_request_password_reset(p_email text)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where lower(email) = lower(trim(p_email))
      and active = true
  );
$$;

revoke all on function public.can_request_password_reset(text) from public;
grant execute on function public.can_request_password_reset(text) to anon, authenticated;
