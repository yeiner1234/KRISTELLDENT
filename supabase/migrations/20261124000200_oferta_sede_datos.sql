-- =============================================================================
-- Oferta autónoma por sede · 3 de 4 · Reparto de los servicios por sede
-- =============================================================================
-- Spec: docs/especificaciones/2026-11-23-oferta-autonoma-por-sede.md, sección 9
-- (pasos 3 a 9). Requiere 20261124000000 y 20261124000100.
--
-- ANTES: haz un respaldo (Database → Backups, o exporta services,
-- professional_services y appointments) y corre las consultas de revisión.
--
-- Todo va en un único bloque DO: si algo falla, no cambia nada. Se puede
-- correr dos veces: solo reparte servicios que aún no tienen sede.
-- =============================================================================
--
-- CONSULTAS DE REVISIÓN (córrelas solas, antes de esta migración)
-- -----------------------------------------------------------------------------
-- R1. Especialidades duplicadas por nombre normalizado. No frenan esta
--     migración, pero sí la 4 (índice único). Unifícalas a mano: pasa sus
--     servicios y profesionales a una y borra o renombra la otra.
--
--   select public.name_key(name) as clave, array_agg(name order by name) as nombres,
--          array_agg(id order by name) as ids
--   from public.specialties
--   group by public.name_key(name)
--   having count(*) > 1;
--
-- R2. Asignaciones cuya especialidad no tiene la profesional. ESTA MIGRACIÓN
--     SE DETIENE si hay alguna: agrégale la especialidad o quítale el
--     servicio (Profesionales → Editar) y vuelve a correrla.
--
--   select ps.id, pr.full_name, s.name as servicio, sp.name as especialidad
--   from public.professional_services ps
--   join public.services s on s.id = ps.service_id
--   join public.specialties sp on sp.id = s.specialty_id
--   left join public.profiles pr on pr.id = ps.professional_id
--   where not exists (
--     select 1 from public.professional_specialties x
--     where x.professional_id = ps.professional_id and x.specialty_id = s.specialty_id
--   );
--
-- R3. Servicios con el mismo nombre (sin tildes ni mayúsculas) que terminarían
--     en la misma sede. ESTA MIGRACIÓN SE DETIENE si hay alguno: renombra uno
--     (Servicios → Editar) antes.
--
--   with uso as (
--     select ps.service_id, pb.branch_id
--     from public.professional_services ps
--     join public.professional_branches pb on pb.professional_id = ps.professional_id
--     union
--     select a.service_id, a.branch_id from public.appointments a where a.service_id is not null
--   )
--   select b.name as sede, public.name_key(s.name) as clave, array_agg(distinct s.name) as servicios
--   from uso u
--   join public.services s on s.id = u.service_id and s.branch_id is null
--   join public.branches b on b.id = u.branch_id
--   group by b.name, public.name_key(s.name)
--   having count(distinct s.id) > 1;
--
-- R4. Citas cuyo servicio tiene una profesional que ya no atiende en la sede
--     de la cita (solo informativa: la cita conserva su servicio).
--
--   select a.appointment_code, a.appointment_date, b.name as sede, pr.full_name, s.name as servicio
--   from public.appointments a
--   join public.branches b on b.id = a.branch_id
--   join public.services s on s.id = a.service_id
--   left join public.profiles pr on pr.id = a.professional_id
--   where not exists (
--     select 1 from public.professional_branches pb
--     where pb.professional_id = a.professional_id and pb.branch_id = a.branch_id
--   )
--   order by a.appointment_date desc;
--
-- R5. Accesos de Equipo de profesionales a sedes donde no atienden. No se
--     borran solos: si no atiende ahí,
--     delete from public.user_branch_access where id = '<access_id>';
--
--   select uba.id as access_id, p.full_name, p.role, b.name as sede
--   from public.user_branch_access uba
--   join public.profiles p on p.id = uba.user_id
--   join public.branches b on b.id = uba.branch_id
--   where p.role::text in ('especialista', 'odontologa_general')
--     and not exists (
--       select 1 from public.professional_branches pb
--       where pb.professional_id = uba.user_id and pb.branch_id = uba.branch_id
--     )
--   order by p.full_name, b.name;
-- =============================================================================

do $$
declare
  v_problem text;
  v_count integer;
  v_service record;
  v_map record;
  v_first boolean;
  v_new_id uuid;
begin
  -- Cambios de datos, no de reglas: estos triggers bloquearían o
  -- reescribirían el reparto (se vuelven a activar al final del bloque).
  --   guard_appointment_changes: no deja tocar citas atendidas o canceladas.
  --   appointments_copy_service: la copia se llena en el paso 9.
  --   set_appointments_updated_at: el reparto no es una edición de la cita.
  --   services_require_active_specialty: un servicio activo de una
  --     especialidad ya desactivada se copia tal como está.
  alter table public.appointments disable trigger guard_appointment_changes;
  alter table public.appointments disable trigger appointments_copy_service;
  alter table public.appointments disable trigger set_appointments_updated_at;
  alter table public.services disable trigger services_require_active_specialty;

  -- --- Paso 3: en qué sedes se usa cada servicio sin sede ---------------------
  drop table if exists pg_temp.service_branch_map;
  create temp table service_branch_map (
    old_service_id uuid not null,
    branch_id uuid not null,
    new_service_id uuid,
    primary key (old_service_id, branch_id)
  ) on commit drop;

  insert into service_branch_map (old_service_id, branch_id)
  select distinct uso.service_id, uso.branch_id
  from (
    select ps.service_id, pb.branch_id
    from public.professional_services ps
    join public.professional_branches pb on pb.professional_id = ps.professional_id
    union
    select a.service_id, a.branch_id
    from public.appointments a
    where a.service_id is not null
  ) uso
  join public.services s on s.id = uso.service_id
  where s.branch_id is null;

  -- --- Comprobaciones (R2 y R3) ----------------------------------------------
  select count(*) into v_count
  from public.professional_services ps
  join public.services s on s.id = ps.service_id
  where not exists (
    select 1 from public.professional_specialties x
    where x.professional_id = ps.professional_id and x.specialty_id = s.specialty_id
  );
  if v_count > 0 then
    raise exception 'Hay % asignaciones de servicios a profesionales sin esa especialidad. Corrígelas con la consulta R2 del inicio de este archivo y vuelve a correrlo.', v_count;
  end if;

  select string_agg(format('%s: %s', d.sede, d.nombres), '; ') into v_problem
  from (
    select b.name as sede, string_agg(distinct s.name, ' / ') as nombres
    from service_branch_map m
    join public.services s on s.id = m.old_service_id
    join public.branches b on b.id = m.branch_id
    group by b.name, s.name_key
    having count(distinct s.id) > 1
    union all
    select b.name, s.name || ' / ' || e.name
    from service_branch_map m
    join public.services s on s.id = m.old_service_id
    join public.services e on e.branch_id = m.branch_id and e.name_key = s.name_key and e.id <> s.id
    join public.branches b on b.id = m.branch_id
  ) d;
  if v_problem is not null then
    raise exception 'Estos servicios tienen el mismo nombre y terminarían en la misma sede: %. Renombra uno (consulta R3) y vuelve a correr este archivo.', v_problem;
  end if;

  -- Las copias se revisan con services_duration_max (máximo 480 minutos).
  select string_agg(distinct format('%s (%s min)', s.name, s.duration_minutes), ', ') into v_problem
  from service_branch_map m
  join public.services s on s.id = m.old_service_id
  where s.duration_minutes > 480;
  if v_problem is not null then
    raise exception 'Estos servicios duran más de 480 minutos: %. Corrige su duración y vuelve a correr este archivo.', v_problem;
  end if;

  -- --- Paso 4: repartir ------------------------------------------------------
  -- La primera sede (por nombre) se queda con la fila original; las demás
  -- reciben una copia con el mismo nombre, especialidad, precio, duración y
  -- estado.
  for v_service in
    select distinct m.old_service_id from service_branch_map m
  loop
    v_first := true;
    for v_map in
      select m.branch_id
      from service_branch_map m
      join public.branches b on b.id = m.branch_id
      where m.old_service_id = v_service.old_service_id
      order by b.name
    loop
      if v_first then
        update public.services set branch_id = v_map.branch_id where id = v_service.old_service_id;
        v_new_id := v_service.old_service_id;
        v_first := false;
      else
        insert into public.services (branch_id, specialty_id, name, duration_minutes, price, active, created_by)
        select v_map.branch_id, s.specialty_id, s.name, s.duration_minutes, s.price, s.active, s.created_by
        from public.services s
        where s.id = v_service.old_service_id
        returning id into v_new_id;
      end if;

      update service_branch_map
      set new_service_id = v_new_id
      where old_service_id = v_service.old_service_id and branch_id = v_map.branch_id;
    end loop;
  end loop;

  -- --- Paso 5: cada cita apunta al servicio de su sede ------------------------
  update public.appointments a
  set service_id = m.new_service_id
  from service_branch_map m
  where a.service_id = m.old_service_id
    and a.branch_id = m.branch_id
    and m.new_service_id <> m.old_service_id;

  -- --- Paso 6: asignaciones --------------------------------------------------
  -- Una fila por sede de la profesional donde existe la copia...
  insert into public.professional_services (professional_id, service_id, active)
  select ps.professional_id, m.new_service_id, ps.active
  from public.professional_services ps
  join service_branch_map m on m.old_service_id = ps.service_id and m.new_service_id <> m.old_service_id
  join public.professional_branches pb on pb.professional_id = ps.professional_id and pb.branch_id = m.branch_id
  on conflict (professional_id, service_id) do nothing;

  -- ...fuera las que apuntan a un servicio de una sede donde no atiende...
  delete from public.professional_services ps
  using public.services s
  where s.id = ps.service_id
    and s.branch_id is not null
    and not exists (
      select 1 from public.professional_branches pb
      where pb.professional_id = ps.professional_id and pb.branch_id = s.branch_id
    );

  -- --- Paso 7: servicios sin uso = "sin sede" e inactivos --------------------
  -- Nadie puede atender un servicio sin sede: fuera sus asignaciones.
  delete from public.professional_services ps
  using public.services s
  where s.id = ps.service_id and s.branch_id is null;

  update public.services set active = false where branch_id is null and active;

  -- ...y el resto recibe su branch_id (lo pone el trigger
  -- professional_services_set_branch).
  update public.professional_services ps
  set branch_id = s.branch_id
  from public.services s
  where s.id = ps.service_id
    and ps.branch_id is distinct from s.branch_id;

  -- --- Paso 8: accesos de Equipo de las profesionales (solo agregar) ---------
  insert into public.user_branch_access (user_id, branch_id)
  select pb.professional_id, pb.branch_id
  from public.professional_branches pb
  join public.profiles p on p.id = pb.professional_id
  where p.role::text in ('especialista', 'odontologa_general')
  on conflict (user_id, branch_id) do nothing;

  -- --- Paso 9: copia del servicio en cada cita -------------------------------
  update public.appointments a
  set service_name = s.name,
      service_price = s.price,
      service_duration_minutes = s.duration_minutes
  from public.services s
  where s.id = a.service_id
    and a.service_name is null;

  alter table public.appointments enable trigger guard_appointment_changes;
  alter table public.appointments enable trigger appointments_copy_service;
  alter table public.appointments enable trigger set_appointments_updated_at;
  alter table public.services enable trigger services_require_active_specialty;
end;
$$;

-- =============================================================================
-- COMPROBACIONES (córrelas después; todas deben devolver 0 filas o el valor
-- indicado)
-- -----------------------------------------------------------------------------
-- C1. Ninguna cita apunta a un servicio de otra sede (0 filas):
--   select a.id from public.appointments a
--   join public.services s on s.id = a.service_id
--   where s.branch_id is distinct from a.branch_id;
--
-- C2. Ninguna asignación sin sede ni en una sede donde no atiende (0 filas):
--   select ps.id from public.professional_services ps
--   left join public.professional_branches pb
--     on pb.professional_id = ps.professional_id and pb.branch_id = ps.branch_id
--   where ps.branch_id is null or pb.id is null;
--
-- C3. Citas con servicio y sin copia (0 filas):
--   select id from public.appointments where service_id is not null and service_name is null;
--
-- C4. Servicios sin sede (deben estar inactivos; se asignan o borran en
--     Oferta por sede):
--   select id, name, active from public.services where branch_id is null;
--
-- C5. Oferta reservable por sede (debe parecerse a lo que hoy se reserva):
--   select b.name as sede, s.name as servicio, pr.full_name
--   from public.offer_bookable_pairs(null) bp
--   join public.services s on s.id = bp.service_id
--   join public.branches b on b.id = s.branch_id
--   join public.profiles pr on pr.id = bp.professional_id
--   order by b.name, s.name, pr.full_name;
--
-- C6. Triggers de appointments y services activos de nuevo (todas 'O'):
--   select tgname, tgenabled from pg_trigger
--   where tgrelid in ('public.appointments'::regclass, 'public.services'::regclass)
--     and not tgisinternal;
-- =============================================================================
