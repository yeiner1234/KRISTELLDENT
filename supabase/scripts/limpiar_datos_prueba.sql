-- ============================================================================
-- SOLO MANUAL. NO ES UNA MIGRACIÓN.
-- Borra los datos de prueba: pacientes de prueba con sus citas, citas y
-- excepciones marcadas "PRUEBA", y especialidades/servicios de prueba.
--
-- NO toca: cuentas (auth.users, profiles), fichas de profesionales, sedes,
-- horarios ni los servicios/especialidades reales.
--
-- Cómo usarlo en el SQL Editor de Supabase:
--   1. Corre solo la PARTE 1 (vista previa) y revisa la lista.
--   2. Si todo es de prueba, corre la PARTE 2 completa (es una transacción:
--      si algo falla, no se borra nada).
-- Se puede correr dos veces sin error.
-- ============================================================================

-- ============================================================================
-- PARTE 1 — VISTA PREVIA (solo lectura)
-- ============================================================================

-- Pacientes que se van a borrar (con cuántas citas tienen).
select
  p.dni,
  p.first_name || ' ' || p.last_name as paciente,
  p.email,
  (select count(*) from public.appointments a where a.patient_id = p.id) as citas
from public.patients p
where p.email ilike '%@example.com'
   or p.email ilike '%.test'
   or p.dni like '9000%'
   or p.first_name ilike '%prueba%'
   or p.last_name ilike '%prueba%'
order by paciente;

-- Citas marcadas PRUEBA de pacientes que NO están en la lista de arriba.
select a.appointment_date, a.start_time, a.reason, p.first_name || ' ' || p.last_name as paciente
from public.appointments a
join public.patients p on p.id = a.patient_id
where a.reason ilike 'PRUEBA%'
order by a.appointment_date;

-- Especialidades y servicios de prueba.
select 'especialidad' as tipo, name, active from public.specialties where name ilike '%prueba%'
union all
select 'servicio', s.name, s.active
from public.services s
join public.specialties sp on sp.id = s.specialty_id
where s.name ilike '%prueba%' or sp.name ilike '%prueba%';

-- Excepciones de horario de prueba.
select exception_date, reason from public.schedule_exceptions where reason ilike 'PRUEBA%';


-- ============================================================================
-- PARTE 2 — BORRADO (corre todo este bloque junto)
-- ============================================================================
begin;

create temp table tmp_test_patients on commit drop as
select id, dni
from public.patients
where email ilike '%@example.com'
   or email ilike '%.test'
   or dni like '9000%'
   or first_name ilike '%prueba%'
   or last_name ilike '%prueba%';

create temp table tmp_test_services on commit drop as
select s.id
from public.services s
join public.specialties sp on sp.id = s.specialty_id
where s.name ilike '%prueba%' or sp.name ilike '%prueba%';

-- 1. Citas de pacientes de prueba y citas marcadas PRUEBA.
delete from public.appointments
where patient_id in (select id from tmp_test_patients)
   or reason ilike 'PRUEBA%';

-- 2. Registro de reenvío de códigos de esos DNI.
delete from public.patient_code_email_log
where dni in (select dni from tmp_test_patients);

-- 3. Pacientes de prueba.
delete from public.patients
where id in (select id from tmp_test_patients);

-- 4. Excepciones de horario de prueba.
delete from public.schedule_exceptions
where reason ilike 'PRUEBA%';

-- 5. Servicios de prueba: se quitan de los profesionales y se borran. Si una
--    cita real todavía los usa, solo se desactivan (la FK impide borrarlos).
delete from public.professional_services
where service_id in (select id from tmp_test_services);

update public.services set active = false
where id in (select id from tmp_test_services)
  and exists (select 1 from public.appointments a where a.service_id = services.id);

delete from public.services
where id in (select id from tmp_test_services)
  and not exists (select 1 from public.appointments a where a.service_id = services.id);

-- 6. Especialidades de prueba: igual, se borran si ya no tienen servicios.
delete from public.professional_specialties
where specialty_id in (select id from public.specialties where name ilike '%prueba%');

update public.specialties set active = false
where name ilike '%prueba%'
  and exists (select 1 from public.services s where s.specialty_id = specialties.id);

delete from public.specialties
where name ilike '%prueba%'
  and not exists (select 1 from public.services s where s.specialty_id = specialties.id);

commit;

-- Comprobación: debe devolver 0 en todas las columnas.
select
  (select count(*) from public.patients
    where email ilike '%@example.com' or email ilike '%.test' or dni like '9000%'
       or first_name ilike '%prueba%' or last_name ilike '%prueba%') as pacientes_prueba,
  (select count(*) from public.appointments where reason ilike 'PRUEBA%') as citas_prueba,
  (select count(*) from public.schedule_exceptions where reason ilike 'PRUEBA%') as excepciones_prueba,
  (select count(*) from public.specialties where name ilike '%prueba%' and active) as especialidades_prueba_activas;
