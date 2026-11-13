-- =============================================================================
-- Rol odontologa_general + límite de una especialidad para especialista
-- =============================================================================
-- Diferencia entre los dos roles clínicos que atienden citas:
--   - especialista: ejerce UNA sola especialidad y ofrece servicios de ella.
--   - odontologa_general: ofrece servicios de cualquier especialidad. Sus
--     filas en professional_specialties las deriva el panel admin a partir de
--     los servicios elegidos, para que aparezca en la reserva de cada
--     especialidad en la que tiene al menos un servicio.
--
-- tecnica sigue sin cambios.
--
-- Nota: el nuevo valor del enum no se usa en ninguna sentencia de esta
-- migración (Postgres no permite usar un valor agregado dentro de la misma
-- transacción); la función del trigger solo compara contra 'especialista'.
-- =============================================================================

alter type public.app_role add value if not exists 'odontologa_general';

comment on table public.profiles is
  'Personal interno autenticado (admin_global, admin_sede, especialista, '
  'odontologa_general, tecnica). No incluye pacientes. No existe registro '
  'público: toda fila se crea desde un flujo administrativo seguro (Edge '
  'Function + Auth Admin API con service_role, nunca desde el cliente).';

comment on table public.professionals is
  'Ficha profesional de un usuario interno con role = especialista u '
  'odontologa_general. El nombre/correo se leen de profiles (mismo id); aquí '
  'solo vive lo propio del ejercicio profesional (bio, estado).';

-- -----------------------------------------------------------------------------
-- Un especialista no puede tener más de una especialidad.
-- -----------------------------------------------------------------------------
-- AFTER ... FOR EACH ROW: se evalúa al terminar la sentencia, así un insert
-- de varias filas a la vez (como hace el panel admin) ve todas sus filas.
-- Solo valida inserciones: los datos existentes no se tocan, pero la próxima
-- vez que se guarde ese profesional deberá quedar con una sola especialidad.
create or replace function public.enforce_specialist_single_specialty()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1
    from public.profiles
    where id = new.professional_id
      and role = 'especialista'
  ) and (
    select count(*)
    from public.professional_specialties
    where professional_id = new.professional_id
  ) > 1 then
    raise exception 'Un especialista solo puede tener una especialidad.'
      using errcode = 'check_violation';
  end if;

  return null;
end;
$$;

revoke all on function public.enforce_specialist_single_specialty() from public;

create trigger enforce_specialist_single_specialty
  after insert on public.professional_specialties
  for each row
  execute function public.enforce_specialist_single_specialty();
