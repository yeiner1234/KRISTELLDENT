-- ============================================================================
-- DIAGNÓSTICO DE LA OFERTA RESERVABLE. SOLO LECTURA. NO ES UNA MIGRACIÓN.
-- ============================================================================
-- Córrelo en el SQL Editor de Supabase BLOQUE POR BLOQUE (selecciona el
-- bloque y pulsa Run): el editor solo muestra el resultado de la última
-- consulta. Ningún bloque deja cambios: el 2 intenta inserts y los deshace.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- BLOQUE 1 · ¿Están aplicadas las migraciones de la oferta?
-- ----------------------------------------------------------------------------
-- Cada fila debe decir true. Un false indica una migración sin aplicar o
-- aplicada a medias (el SQL Editor sigue después de un error si se pegan
-- varias a la vez).
select 'specialties.created_by con default auth.uid()' as comprobacion,
       exists (select 1 from information_schema.columns
               where table_schema = 'public' and table_name = 'specialties'
                 and column_name = 'created_by' and column_default like '%auth.uid()%') as ok
union all
select 'specialties.name_key (generada)',
       exists (select 1 from information_schema.columns
               where table_schema = 'public' and table_name = 'specialties' and column_name = 'name_key')
union all
select 'política specialties_insert_admin (admin_global o admin_sede)',
       exists (select 1 from pg_policies
               where schemaname = 'public' and tablename = 'specialties'
                 and policyname = 'specialties_insert_admin')
union all
select 'ya no existe specialties_insert_admin_global (solo global)',
       not exists (select 1 from pg_policies
                   where schemaname = 'public' and tablename = 'specialties'
                     and policyname = 'specialties_insert_admin_global')
union all
select 'política specialties_select_authenticated (using true)',
       exists (select 1 from pg_policies
               where schemaname = 'public' and tablename = 'specialties'
                 and policyname = 'specialties_select_authenticated')
union all
select 'trigger specialties_unique_name',
       exists (select 1 from pg_trigger
               where tgrelid = 'public.specialties'::regclass and tgname = 'specialties_unique_name')
union all
select 'índice specialties_name_key_unique (20261124000300)',
       exists (select 1 from pg_indexes where schemaname = 'public' and indexname = 'specialties_name_key_unique')
union all
select 'services.branch_id not null (20261124000500)',
       exists (select 1 from information_schema.columns
               where table_schema = 'public' and table_name = 'services'
                 and column_name = 'branch_id' and is_nullable = 'NO')
union all
select 'get_branch_offer_status con motivo preciso (20261124000800)',
       coalesce((select prosrc like '%any_active_with_schedule%' from pg_proc
                 where proname = 'get_branch_offer_status' and pronamespace = 'public'::regnamespace), false);

-- Políticas y triggers vivos de specialties y professional_specialties, para
-- compararlos con los archivos de supabase/migrations.
-- select tablename, policyname, cmd, roles, qual, with_check
-- from pg_policies
-- where schemaname = 'public' and tablename in ('specialties', 'professional_specialties')
-- order by tablename, cmd, policyname;
--
-- select tgrelid::regclass as tabla, tgname, pg_get_triggerdef(oid)
-- from pg_trigger
-- where tgrelid in ('public.specialties'::regclass, 'public.professional_specialties'::regclass)
--   and not tgisinternal;


-- ----------------------------------------------------------------------------
-- BLOQUE 2 · Agregar una especialidad, como cada administradora
-- ----------------------------------------------------------------------------
-- Repite exactamente lo que hace la pantalla (insert ... returning, con la
-- sesión de cada admin activa) y deshace el insert. Columna "resultado":
-- "PUEDE agregar" o el error exacto de la base (código y mensaje).
create temp table diag_especialidad (
  admin text,
  rol text,
  intento text,
  resultado text
) on commit drop;

do $$
declare
  r record;
  t record;
  v_id uuid;
  v_specialty uuid;
begin
  for r in
    select id, full_name, role::text as role
    from public.profiles
    where role in ('admin_global', 'admin_sede') and active
    order by role, full_name
  loop
    -- a) Especialidades / Nuevo servicio: insert en la lista compartida.
    begin
      perform set_config('request.jwt.claims',
        json_build_object('sub', r.id, 'role', 'authenticated')::text, true);
      set local role authenticated;
      insert into public.specialties (name, description)
      values ('Zz diagnóstico ' || left(r.id::text, 8), null)
      returning id into v_id;
      raise exception using errcode = 'P0099', message = 'ok';
    exception when others then
      insert into diag_especialidad values (
        r.full_name, r.role, 'Especialidades / Nuevo servicio',
        case when sqlstate = 'P0099' then 'PUEDE agregar' else sqlstate || ' · ' || sqlerrm end);
    end;

    -- b) Ficha de la profesional: agregarle una especialidad que no tiene,
    --    a cada profesional que esa admin ve en Profesionales.
    for t in
      select p.id, pr.full_name, pr.role::text as role
      from public.professionals p
      join public.profiles pr on pr.id = p.id
      where r.role = 'admin_global'
         or exists (
           select 1 from public.professional_branches pb
           join public.user_branch_access uba on uba.branch_id = pb.branch_id
           where pb.professional_id = p.id and uba.user_id = r.id)
      order by pr.full_name
    loop
      select sp.id into v_specialty
      from public.specialties sp
      where sp.active
        and not exists (select 1 from public.professional_specialties x
                        where x.professional_id = t.id and x.specialty_id = sp.id)
      order by sp.name
      limit 1;

      continue when v_specialty is null;

      begin
        perform set_config('request.jwt.claims',
          json_build_object('sub', r.id, 'role', 'authenticated')::text, true);
        set local role authenticated;
        insert into public.professional_specialties (professional_id, specialty_id)
        values (t.id, v_specialty);
        raise exception using errcode = 'P0099', message = 'ok';
      exception when others then
        insert into diag_especialidad values (
          r.full_name, r.role, 'Ficha de ' || t.full_name || ' (' || t.role || ')',
          case when sqlstate = 'P0099' then 'PUEDE agregar' else sqlstate || ' · ' || sqlerrm end);
      end;
    end loop;
  end loop;
end $$;

select * from diag_especialidad order by rol, admin, intento;


-- ----------------------------------------------------------------------------
-- BLOQUE 3 · Por qué cada servicio y profesional aparece o no en la reserva
-- ----------------------------------------------------------------------------
-- Una fila por (sede, servicio, profesional). Profesionales consideradas:
-- las que tienen el servicio asignado y las que atienden en la sede y tienen
-- la especialidad del servicio. Un servicio sin ninguna sale con profesional
-- vacía. "motivo" es la primera condición que falla.
-- Las columnas reservable_bd y en_reserva_publica salen de las MISMAS
-- funciones que usa la reserva (is_bookable_service y
-- get_bookable_professionals). libres_14d llama a get_available_slots día
-- por día (hoy, hora de Lima, y 13 días más).
with hoy as (
  select (now() at time zone 'America/Lima')::date as d
),
candidatas as (
  select ps.service_id, ps.professional_id
  from public.professional_services ps
  union
  select s.id, pb.professional_id
  from public.services s
  join public.professional_branches pb on pb.branch_id = s.branch_id
  join public.professional_specialties x
    on x.professional_id = pb.professional_id and x.specialty_id = s.specialty_id
),
base as (
  select
    b.id as branch_id, b.name as sede, b.active as sede_activa,
    sp.id as specialty_id, sp.name as especialidad, sp.active as especialidad_activa,
    s.id as service_id, s.name as servicio, s.active as servicio_activo,
    c.professional_id,
    pr.full_name as profesional,
    pr.role::text as rol,
    coalesce(p.active, false) as ficha_activa,
    coalesce(pr.active, false) as cuenta_activa,
    exists (select 1 from public.professional_branches pb
            where pb.professional_id = c.professional_id and pb.branch_id = b.id) as atiende_en_sede,
    exists (select 1 from public.professional_specialties x
            where x.professional_id = c.professional_id and x.specialty_id = sp.id) as tiene_especialidad,
    ps.service_id is not null as servicio_asignado,
    coalesce(ps.active, false) as asignacion_activa,
    exists (select 1 from public.professional_schedules sch
            where sch.professional_id = c.professional_id and sch.branch_id = b.id) as horario_en_sede
  from public.services s
  join public.branches b on b.id = s.branch_id
  join public.specialties sp on sp.id = s.specialty_id
  left join candidatas c on c.service_id = s.id
  left join public.professionals p on p.id = c.professional_id
  left join public.profiles pr on pr.id = c.professional_id
  left join public.professional_services ps
    on ps.service_id = s.id and ps.professional_id = c.professional_id
),
calculo as (
  select
    base.*,
    case when base.professional_id is null then false
         else public.is_bookable_service(base.branch_id, base.service_id, base.professional_id) end as reservable_bd,
    case when base.professional_id is null then false
         else exists (select 1 from public.get_bookable_professionals(base.branch_id, base.specialty_id, base.service_id) g
                      where g.id = base.professional_id) end as en_reserva_publica,
    case when base.professional_id is null then false
         else exists (select 1
                      from hoy, generate_series(hoy.d, hoy.d + 13, interval '1 day') as dia,
                           lateral public.get_available_slots(base.professional_id, base.branch_id, base.service_id, dia::date) slot) end as libres_14d
  from base
)
select
  sede, especialidad, servicio, profesional, rol,
  sede_activa, especialidad_activa, servicio_activo,
  ficha_activa, cuenta_activa, atiende_en_sede, tiene_especialidad,
  servicio_asignado, asignacion_activa, horario_en_sede, libres_14d,
  reservable_bd, en_reserva_publica,
  case
    when not sede_activa then 'Sede desactivada'
    when not especialidad_activa then 'Especialidad desactivada'
    when not servicio_activo then 'Servicio desactivado'
    when professional_id is null then 'Nadie asignado a este servicio'
    when not cuenta_activa then 'Cuenta desactivada (Equipo)'
    when not ficha_activa then 'Ficha desactivada'
    when not atiende_en_sede then 'No atiende en ' || sede
    when not tiene_especialidad then 'No tiene la especialidad ' || especialidad
    when not servicio_asignado then 'Servicio no asignado'
    when not asignacion_activa then 'Asignación desactivada'
    when not horario_en_sede then 'Sin horario en ' || sede
    when not libres_14d then 'Visible, pero sin horas libres en 14 días'
    else 'OK: visible y con horas libres'
  end as motivo
from calculo
order by sede, especialidad, servicio, profesional nulls first;


-- ----------------------------------------------------------------------------
-- BLOQUE 4 · Sedes: nombres con posibles errores de escritura
-- ----------------------------------------------------------------------------
select
  id, name, active,
  name <> btrim(name) as espacios_extremos,
  name ~ '\s{2,}' as espacios_dobles,
  name !~ '^KristellDent ' as sin_prefijo_kristelldent,
  name ~* 'jaen' and name !~ 'Jaén' as jaen_sin_tilde,
  (select string_agg(o.name, ', ') from public.branches o
    where o.id <> b.id and public.name_key(o.name) = public.name_key(b.name)) as duplicada_con
from public.branches b
order by name;


-- ----------------------------------------------------------------------------
-- BLOQUE 5 · Personas con ficha profesional y datos de prueba
-- ----------------------------------------------------------------------------
-- Fichas cuya cuenta no tiene rol profesional (p. ej. una admin_sede que
-- además atiende), y todo lo que tenga "prueba" en el nombre.
select
  pr.full_name, pr.email, pr.role::text as rol, pr.active as cuenta_activa, p.active as ficha_activa,
  pr.role::text not in ('especialista', 'odontologa_general') as rol_no_profesional,
  pr.full_name ilike '%prueba%' or pr.email ilike '%prueba%' as es_prueba,
  (select string_agg(b.name, ', ' order by b.name) from public.professional_branches pb
    join public.branches b on b.id = pb.branch_id where pb.professional_id = p.id) as atiende_en,
  (select string_agg(b.name, ', ' order by b.name) from public.user_branch_access uba
    join public.branches b on b.id = uba.branch_id where uba.user_id = p.id) as acceso_en_equipo,
  (select string_agg(sp.name, ', ' order by sp.name) from public.professional_specialties x
    join public.specialties sp on sp.id = x.specialty_id where x.professional_id = p.id) as especialidades
from public.professionals p
join public.profiles pr on pr.id = p.id
order by rol_no_profesional desc, es_prueba desc, pr.full_name;

-- Especialidades y servicios de prueba: supabase/scripts/revisar_datos_prueba_oferta.sql
