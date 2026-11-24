-- ============================================================================
-- SOLO LECTURA. NO ES UNA MIGRACIÓN. No borra ni cambia nada.
-- Lista las especialidades y servicios de prueba ("PRUEBA", "prueba",
-- "Nombre prueba"...) y todo lo que los usa, para decidir qué desactivar y
-- qué borrar. Córrelo en el SQL Editor.
-- ============================================================================

-- 1. Especialidades de prueba y cuánto se usan.
select
  sp.id,
  sp.name as especialidad,
  sp.active as activa,
  (select count(*) from public.services s where s.specialty_id = sp.id) as servicios,
  (select count(*) from public.professional_specialties x where x.specialty_id = sp.id) as profesionales,
  (select count(*)
     from public.appointments a
     join public.services s on s.id = a.service_id
    where s.specialty_id = sp.id) as citas
from public.specialties sp
where sp.name ilike '%prueba%'
order by sp.name;

-- 2. Servicios de prueba (por nombre o por ser de una especialidad de prueba),
--    con su sede, asignaciones y citas.
select
  s.id,
  s.name as servicio,
  sp.name as especialidad,
  b.name as sede,
  s.active as activo,
  (select count(*) from public.professional_services ps where ps.service_id = s.id) as asignaciones,
  (select count(*) from public.appointments a where a.service_id = s.id) as citas,
  (select count(*)
     from public.appointments a
    where a.service_id = s.id
      and a.status::text in ('pending', 'confirmed', 'in_room')
      and a.appointment_date >= (now() at time zone 'America/Lima')::date) as citas_pendientes
from public.services s
join public.specialties sp on sp.id = s.specialty_id
left join public.branches b on b.id = s.branch_id
where s.name ilike '%prueba%' or sp.name ilike '%prueba%'
order by b.name, s.name;

-- 3. Profesionales asignados a esos servicios.
select pr.full_name, s.name as servicio, b.name as sede
from public.professional_services ps
join public.services s on s.id = ps.service_id
join public.specialties sp on sp.id = s.specialty_id
join public.profiles pr on pr.id = ps.professional_id
left join public.branches b on b.id = ps.branch_id
where s.name ilike '%prueba%' or sp.name ilike '%prueba%'
order by pr.full_name, s.name;

-- 4. Perfiles de prueba ("Nombre prueba") y sus citas.
select
  p.id,
  p.full_name,
  p.email,
  p.role,
  p.active,
  (select count(*) from public.appointments a where a.professional_id = p.id) as citas
from public.profiles p
where p.full_name ilike '%prueba%'
order by p.full_name;

-- ============================================================================
-- QUÉ HACER CON CADA UNO (propuesta; ejecútala tú después de revisar):
--
-- a) Servicio de prueba CON citas (asignaciones > 0 o citas > 0): no se puede
--    borrar (la FK de appointments lo impide). Desactívalo:
--      update public.services set active = false where id = '<id>';
--    y quítale las asignaciones para que no ensucie la ficha:
--      delete from public.professional_services where service_id = '<id>';
--
-- b) Servicio de prueba SIN citas: bórralo.
--      delete from public.professional_services where service_id = '<id>';
--      delete from public.services where id = '<id>';
--
-- c) Especialidad de prueba: primero resuelve sus servicios (a o b) y quita la
--    especialidad a sus profesionales (Profesionales → ficha). Si ya nada la
--    usa, bórrala desde Especialidades (admin_global) o:
--      delete from public.specialties where id = '<id>';
--    Si tiene servicios con citas, déjala desactivada:
--      update public.specialties set active = false where id = '<id>';
--    (la base no deja desactivarla mientras tenga servicios activos).
--
-- d) Perfil de prueba: desactívalo en Equipo (no se borra si tiene citas).
-- ============================================================================
