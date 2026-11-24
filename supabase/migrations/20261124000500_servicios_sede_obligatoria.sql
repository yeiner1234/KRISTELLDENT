-- =============================================================================
-- Oferta autónoma por sede · Cierre (fase 5)
-- =============================================================================
-- Spec: docs/especificaciones/2026-11-23-oferta-autonoma-por-sede.md, fase 5.
-- Requiere 20261124000000 a 20261124000400.
--
-- 1. services.branch_id pasa a NOT NULL: todo servicio es de una sede.
-- 2. professional_services.branch_id pasa a NOT NULL (lo llena un trigger).
-- 3. El público (anon) ya no lee la tabla services: la reserva usa
--    get_branch_specialties, get_bookable_services y
--    get_bookable_professionals (spec 7.1, "Público: solo vía funciones").
--
-- ANTES: esta consulta debe devolver 0 filas. Si devuelve alguna, ve a
-- "Oferta por sede" → "Servicios sin sede" y asígnalos a una sede o bórralos.
--
--   select id, name, active from public.services where branch_id is null;
--
-- Si hay servicios sin sede la migración se detiene con un mensaje claro y no
-- cambia nada. Se puede correr dos veces sin error.
-- =============================================================================

do $$
declare
  v_without_branch text;
  v_assignments integer;
begin
  select string_agg(name, ', ' order by name) into v_without_branch
  from public.services
  where branch_id is null;

  if v_without_branch is not null then
    raise exception 'Hay servicios sin sede: %. Asígnalos a una sede o bórralos en "Oferta por sede" y vuelve a correr este archivo.', v_without_branch;
  end if;

  select count(*) into v_assignments from public.professional_services where branch_id is null;
  if v_assignments > 0 then
    raise exception 'Hay % asignaciones de servicios sin sede. Corre otra vez 20261124000200_oferta_sede_datos.sql y vuelve a correr este archivo.', v_assignments;
  end if;

  alter table public.services alter column branch_id set not null;
  alter table public.professional_services alter column branch_id set not null;
end;
$$;

comment on column public.services.branch_id is
  'Sede dueña del servicio. Su precio y duración son los de esa sede.';

drop policy if exists services_select_public_active on public.services;
revoke select on public.services from anon;
