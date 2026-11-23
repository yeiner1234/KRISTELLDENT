-- =============================================================================
-- Oferta autónoma por sede · 4 de 4 · Nombres únicos
-- =============================================================================
-- Spec: sección 9, paso 10. Requiere 20261124000200_oferta_sede_datos.sql.
--
-- - specialties: un nombre normalizado una sola vez en toda la clínica.
-- - services: un nombre normalizado una sola vez por sede.
-- Los triggers specialties_unique_name y services_guard_branch_and_name dan
-- el mensaje claro; estos índices son la garantía final ante una carrera.
--
-- Si hay duplicados la migración se detiene con la lista, sin cambiar nada.
-- Para verlos antes:
--
--   select name_key, array_agg(name order by name) from public.specialties
--   group by name_key having count(*) > 1;
--
--   select b.name as sede, s.name_key, array_agg(s.name order by s.name)
--   from public.services s join public.branches b on b.id = s.branch_id
--   group by b.name, s.name_key having count(*) > 1;
--
-- Se puede correr dos veces sin error.
-- =============================================================================

do $$
declare
  v_problem text;
begin
  select string_agg(d.nombres, '; ') into v_problem
  from (
    select string_agg(name, ' / ' order by name) as nombres
    from public.specialties
    group by name_key
    having count(*) > 1
  ) d;
  if v_problem is not null then
    raise exception 'Hay especialidades repetidas: %. Unifícalas y vuelve a correr este archivo.', v_problem;
  end if;

  select string_agg(format('%s: %s', d.sede, d.nombres), '; ') into v_problem
  from (
    select b.name as sede, string_agg(s.name, ' / ' order by s.name) as nombres
    from public.services s
    join public.branches b on b.id = s.branch_id
    group by b.name, s.name_key
    having count(*) > 1
  ) d;
  if v_problem is not null then
    raise exception 'Hay servicios repetidos en una sede: %. Renombra uno y vuelve a correr este archivo.', v_problem;
  end if;
end;
$$;

create unique index if not exists specialties_name_key_unique on public.specialties (name_key);
create unique index if not exists services_branch_name_key_unique on public.services (branch_id, name_key);
