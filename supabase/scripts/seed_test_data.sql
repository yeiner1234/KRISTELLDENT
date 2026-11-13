-- ============================================================================
-- SOLO PARA PRUEBAS. NO ES UNA MIGRACIÓN.
-- Se corre a mano en el SQL Editor de Supabase; `supabase db push` no lo aplica.
-- NO es idempotente: crea citas nuevas cada vez que se ejecuta.
-- Depende de dos profesionales que ya existen en la base (UUID fijos abajo).
-- Para borrar los datos de prueba: supabase/cleanup_fase10_test_data.sql.
-- ============================================================================

-- ============================================================================
-- Datos de prueba para probar todas las funcionalidades (especialmente Reservar).
-- Idempotente: se puede correr más de una vez sin duplicar sucursales,
-- especialidades ni pacientes (usa nombre/dni como clave). Las citas SÍ se
-- vuelven a crear cada vez que se corre (usan fechas relativas a "hoy"),
-- así que corre este script una sola vez.
--
-- Requiere permisos de owner de la base (ejecútalo en el SQL Editor de
-- Supabase, o vía `supabase db push` / `psql`) — NO funciona con la clave
-- anon del frontend porque RLS bloquea la mayoría de estos inserts.
-- ============================================================================

do $$
declare
  v_monday date := date_trunc('week', current_date)::date; -- lunes de esta semana

  v_branch_bagua uuid;
  v_branch_jaen uuid;
  v_branch_chachapoyas uuid;
  v_branch_chiclayo uuid;

  v_sp_ortodoncia uuid;
  v_sp_prueba uuid;
  v_sp_general uuid;
  v_sp_endodoncia uuid;
  v_sp_periodoncia uuid;
  v_sp_pediatria uuid;
  v_sp_cirugia uuid;

  v_sv_control_orto uuid;
  v_sv_revision uuid;
  v_sv_limpieza uuid;
  v_sv_conducto uuid;
  v_sv_raspado uuid;
  v_sv_primera_infantil uuid;
  v_sv_extraccion uuid;

  v_prof1 uuid := '5be42d4a-a72e-484d-9dae-e9fbc8b0b4d6'; -- ya existe, base Bagua
  v_prof2 uuid := '52f1fc15-a580-40ff-81d3-6ec23fa76c45'; -- ya existe, base Jaén

  v_pt1 uuid; v_pt2 uuid; v_pt3 uuid; v_pt4 uuid; v_pt5 uuid;
  v_pt6 uuid; v_pt7 uuid; v_pt8 uuid; v_pt9 uuid; v_pt10 uuid;
begin

  -- ==========================================================================
  -- 1. SUCURSALES — ya existían Bagua y Jaén, se agregan 2 más (total 4)
  -- ==========================================================================
  select id into v_branch_bagua from public.branches where name = 'KtristellDent Bagua';
  select id into v_branch_jaen from public.branches where name = 'KristellDent Jaen';

  insert into public.branches (name, address, region, google_maps_address, phone, lat, lng, active)
  values ('KristellDent Chachapoyas', 'Jr. Ayacucho 815', 'Chachapoyas, Amazonas', 'Jr. Ayacucho 815, Chachapoyas, Amazonas, Peru', '941 111 222', -6.2297, -77.8703, true)
  on conflict (name) do nothing;
  select id into v_branch_chachapoyas from public.branches where name = 'KristellDent Chachapoyas';

  insert into public.branches (name, address, region, google_maps_address, phone, lat, lng, active)
  values ('KristellDent Chiclayo', 'Av. Balta 1120', 'Chiclayo, Lambayeque', 'Av. Jose Balta 1120, Chiclayo, Lambayeque, Peru', '941 333 444', -6.7714, -79.8409, true)
  on conflict (name) do nothing;
  select id into v_branch_chiclayo from public.branches where name = 'KristellDent Chiclayo';

  -- Horario de las 2 sucursales nuevas (las de Bagua/Jaén ya tenían horario)
  insert into public.branch_schedules (branch_id, day_of_week, open_time, close_time)
  select v_branch_chachapoyas, d, '08:00', '17:00'
  from unnest(array[1,2,3,4,5,6]) as d
  where not exists (
    select 1 from public.branch_schedules where branch_id = v_branch_chachapoyas and day_of_week = d
  );

  insert into public.branch_schedules (branch_id, day_of_week, open_time, close_time)
  select v_branch_chiclayo, d, '09:00', '20:00'
  from unnest(array[1,2,3,4,5,6]) as d
  where not exists (
    select 1 from public.branch_schedules where branch_id = v_branch_chiclayo and day_of_week = d
  );

  -- ==========================================================================
  -- 2. ESPECIALIDADES — se dejan "Ortodoncia" y la de PRUEBA tal cual, se
  --    agregan las que faltan para tener el set completo de la clínica
  -- ==========================================================================
  select id into v_sp_ortodoncia from public.specialties where name = 'Ortodoncia';
  select id into v_sp_prueba from public.specialties where name like 'PRUEBA%Odontologia General%';

  insert into public.specialties (name, description, active)
  values ('Odontología General', 'Revisiones, higiene y empastes. La puerta de entrada para cualquier tratamiento.', true)
  on conflict (name) do nothing;
  select id into v_sp_general from public.specialties where name = 'Odontología General';

  insert into public.specialties (name, description, active)
  values ('Endodoncia', 'Tratamiento de conductos con microscopio para conservar el diente.', true)
  on conflict (name) do nothing;
  select id into v_sp_endodoncia from public.specialties where name = 'Endodoncia';

  insert into public.specialties (name, description, active)
  values ('Periodoncia', 'Diagnóstico y control de encías, raspados y mantenimiento periodontal.', true)
  on conflict (name) do nothing;
  select id into v_sp_periodoncia from public.specialties where name = 'Periodoncia';

  insert into public.specialties (name, description, active)
  values ('Odontopediatría', 'Primeras visitas, selladores y seguimiento del recambio dental.', true)
  on conflict (name) do nothing;
  select id into v_sp_pediatria from public.specialties where name = 'Odontopediatría';

  insert into public.specialties (name, description, active)
  values ('Cirugía Dental', 'Extracciones, cordales e implantes con planificación digital previa.', true)
  on conflict (name) do nothing;
  select id into v_sp_cirugia from public.specialties where name = 'Cirugía Dental';

  -- ==========================================================================
  -- 3. SERVICIOS por especialidad nueva
  -- ==========================================================================
  insert into public.services (specialty_id, name, duration_minutes, price, active)
  select v_sp_ortodoncia, 'Control de ortodoncia', 30, 60, true
  where not exists (select 1 from public.services where specialty_id = v_sp_ortodoncia and name = 'Control de ortodoncia')
  returning id into v_sv_control_orto;
  if v_sv_control_orto is null then
    select id into v_sv_control_orto from public.services where specialty_id = v_sp_ortodoncia and name = 'Control de ortodoncia';
  end if;

  insert into public.services (specialty_id, name, duration_minutes, price, active)
  select v_sp_general, 'Revisión y diagnóstico', 30, 40, true
  where not exists (select 1 from public.services where specialty_id = v_sp_general and name = 'Revisión y diagnóstico')
  returning id into v_sv_revision;
  if v_sv_revision is null then
    select id into v_sv_revision from public.services where specialty_id = v_sp_general and name = 'Revisión y diagnóstico';
  end if;

  insert into public.services (specialty_id, name, duration_minutes, price, active)
  select v_sp_general, 'Limpieza dental', 45, 55, true
  where not exists (select 1 from public.services where specialty_id = v_sp_general and name = 'Limpieza dental')
  returning id into v_sv_limpieza;
  if v_sv_limpieza is null then
    select id into v_sv_limpieza from public.services where specialty_id = v_sp_general and name = 'Limpieza dental';
  end if;

  insert into public.services (specialty_id, name, duration_minutes, price, active)
  select v_sp_endodoncia, 'Tratamiento de conducto', 60, 180, true
  where not exists (select 1 from public.services where specialty_id = v_sp_endodoncia and name = 'Tratamiento de conducto')
  returning id into v_sv_conducto;
  if v_sv_conducto is null then
    select id into v_sv_conducto from public.services where specialty_id = v_sp_endodoncia and name = 'Tratamiento de conducto';
  end if;

  insert into public.services (specialty_id, name, duration_minutes, price, active)
  select v_sp_periodoncia, 'Raspado y alisado periodontal', 45, 90, true
  where not exists (select 1 from public.services where specialty_id = v_sp_periodoncia and name = 'Raspado y alisado periodontal')
  returning id into v_sv_raspado;
  if v_sv_raspado is null then
    select id into v_sv_raspado from public.services where specialty_id = v_sp_periodoncia and name = 'Raspado y alisado periodontal';
  end if;

  insert into public.services (specialty_id, name, duration_minutes, price, active)
  select v_sp_pediatria, 'Primera visita infantil', 30, 35, true
  where not exists (select 1 from public.services where specialty_id = v_sp_pediatria and name = 'Primera visita infantil')
  returning id into v_sv_primera_infantil;
  if v_sv_primera_infantil is null then
    select id into v_sv_primera_infantil from public.services where specialty_id = v_sp_pediatria and name = 'Primera visita infantil';
  end if;

  insert into public.services (specialty_id, name, duration_minutes, price, active)
  select v_sp_cirugia, 'Extracción simple', 40, 70, true
  where not exists (select 1 from public.services where specialty_id = v_sp_cirugia and name = 'Extracción simple')
  returning id into v_sv_extraccion;
  if v_sv_extraccion is null then
    select id into v_sv_extraccion from public.services where specialty_id = v_sp_cirugia and name = 'Extracción simple';
  end if;

  -- ==========================================================================
  -- 4. Vincular a los 2 profesionales YA EXISTENTES con las 4 sucursales,
  --    las especialidades nuevas y sus servicios (además de lo que ya tenían)
  -- ==========================================================================
  -- Profesional 1: base Bagua, visita Chachapoyas los sábados
  insert into public.professional_branches (professional_id, branch_id)
  select v_prof1, v_branch_chachapoyas
  where not exists (select 1 from public.professional_branches where professional_id = v_prof1 and branch_id = v_branch_chachapoyas);

  insert into public.professional_specialties (professional_id, specialty_id)
  select v_prof1, s from unnest(array[v_sp_ortodoncia, v_sp_general, v_sp_endodoncia]) as s
  where not exists (select 1 from public.professional_specialties where professional_id = v_prof1 and specialty_id = s);

  insert into public.professional_services (professional_id, service_id)
  select v_prof1, s from unnest(array[v_sv_control_orto, v_sv_revision, v_sv_limpieza, v_sv_conducto]) as s
  where not exists (select 1 from public.professional_services where professional_id = v_prof1 and service_id = s);

  -- Profesional 2: base Jaén, visita Chiclayo los sábados
  insert into public.professional_branches (professional_id, branch_id)
  select v_prof2, v_branch_chiclayo
  where not exists (select 1 from public.professional_branches where professional_id = v_prof2 and branch_id = v_branch_chiclayo);

  insert into public.professional_specialties (professional_id, specialty_id)
  select v_prof2, s from unnest(array[v_sp_periodoncia, v_sp_pediatria, v_sp_cirugia]) as s
  where not exists (select 1 from public.professional_specialties where professional_id = v_prof2 and specialty_id = s);

  insert into public.professional_services (professional_id, service_id)
  select v_prof2, s from unnest(array[v_sv_raspado, v_sv_primera_infantil, v_sv_extraccion]) as s
  where not exists (select 1 from public.professional_services where professional_id = v_prof2 and service_id = s);

  -- ==========================================================================
  -- 5. Horarios de profesionales — de lunes a viernes en su sede base,
  --    sábado en la sede secundaria (ya tenían solo el lunes cargado)
  -- ==========================================================================
  insert into public.professional_schedules (professional_id, branch_id, day_of_week, start_time, end_time)
  select v_prof1, v_branch_bagua, t.d, t.s::time, t.e::time
  from (values (2,'09:00','13:00'),(2,'14:00','17:00'),
               (3,'09:00','13:00'),(3,'14:00','17:00'),
               (4,'09:00','13:00'),(4,'14:00','17:00'),
               (5,'09:00','13:00'),(5,'14:00','17:00')) as t(d,s,e)
  where not exists (
    select 1 from public.professional_schedules
    where professional_id = v_prof1 and branch_id = v_branch_bagua and day_of_week = t.d and start_time = t.s::time
  );

  insert into public.professional_schedules (professional_id, branch_id, day_of_week, start_time, end_time)
  select v_prof1, v_branch_chachapoyas, 6, '08:00', '13:00'
  where not exists (
    select 1 from public.professional_schedules
    where professional_id = v_prof1 and branch_id = v_branch_chachapoyas and day_of_week = 6
  );

  insert into public.professional_schedules (professional_id, branch_id, day_of_week, start_time, end_time)
  select v_prof2, v_branch_jaen, t.d, t.s::time, t.e::time
  from (values (2,'09:00','13:00'),(2,'14:00','18:00'),
               (3,'09:00','13:00'),(3,'14:00','18:00'),
               (4,'09:00','13:00'),(4,'14:00','18:00'),
               (5,'09:00','13:00'),(5,'14:00','18:00')) as t(d,s,e)
  where not exists (
    select 1 from public.professional_schedules
    where professional_id = v_prof2 and branch_id = v_branch_jaen and day_of_week = t.d and start_time = t.s::time
  );

  insert into public.professional_schedules (professional_id, branch_id, day_of_week, start_time, end_time)
  select v_prof2, v_branch_chiclayo, 6, '09:00', '14:00'
  where not exists (
    select 1 from public.professional_schedules
    where professional_id = v_prof2 and branch_id = v_branch_chiclayo and day_of_week = 6
  );

  -- ==========================================================================
  -- 6. PACIENTES (10 de prueba)
  -- ==========================================================================
  insert into public.patients (dni, first_name, last_name, phone, email) values
    ('45678912','Carla','Medina','+51 987 654 321','carla.medina@example.com')
    on conflict (dni) do nothing;
  insert into public.patients (dni, first_name, last_name, phone, email) values
    ('41234567','Jorge','Salas','+51 976 543 210','jorge.salas@example.com')
    on conflict (dni) do nothing;
  insert into public.patients (dni, first_name, last_name, phone, email) values
    ('48765432','Marta','Luján','+51 965 432 109','marta.lujan@example.com')
    on conflict (dni) do nothing;
  insert into public.patients (dni, first_name, last_name, phone, email) values
    ('42345678','Diego','Ferrer','+51 954 321 098','diego.ferrer@example.com')
    on conflict (dni) do nothing;
  insert into public.patients (dni, first_name, last_name, phone, email) values
    ('47890123','Noelia','Paz','+51 943 210 987','noelia.paz@example.com')
    on conflict (dni) do nothing;
  insert into public.patients (dni, first_name, last_name, phone, email) values
    ('43456789','Andrés','Quispe','+51 932 109 876','andres.quispe@example.com')
    on conflict (dni) do nothing;
  insert into public.patients (dni, first_name, last_name, phone, email) values
    ('46789012','Valeria','Cusi','+51 921 098 765','valeria.cusi@example.com')
    on conflict (dni) do nothing;
  insert into public.patients (dni, first_name, last_name, phone, email) values
    ('44567890','Renzo','Aguilar','+51 910 987 654','renzo.aguilar@example.com')
    on conflict (dni) do nothing;
  insert into public.patients (dni, first_name, last_name, phone, email) values
    ('49012345','Camila','Torres','+51 909 876 543','camila.torres@example.com')
    on conflict (dni) do nothing;
  insert into public.patients (dni, first_name, last_name, phone, email) values
    ('40123456','Bruno','Salazar','+51 998 765 432','bruno.salazar@example.com')
    on conflict (dni) do nothing;

  select id into v_pt1 from public.patients where dni = '45678912';
  select id into v_pt2 from public.patients where dni = '41234567';
  select id into v_pt3 from public.patients where dni = '48765432';
  select id into v_pt4 from public.patients where dni = '42345678';
  select id into v_pt5 from public.patients where dni = '47890123';
  select id into v_pt6 from public.patients where dni = '43456789';
  select id into v_pt7 from public.patients where dni = '46789012';
  select id into v_pt8 from public.patients where dni = '44567890';
  select id into v_pt9 from public.patients where dni = '49012345';
  select id into v_pt10 from public.patients where dni = '40123456';

  -- ==========================================================================
  -- 7. CITAS — semana actual (lunes = v_monday) + una semana adelante,
  --    con estados variados. Horarios dentro de las franjas ya sembradas.
  -- ==========================================================================
  -- Profesional 1 en Bagua (lunes a viernes de esta semana)
  insert into public.appointments (patient_id, professional_id, branch_id, service_id, appointment_date, start_time, end_time, status, reason) values
    (v_pt1, v_prof1, v_branch_bagua, v_sv_control_orto, v_monday, '09:00', '09:30', 'confirmed', 'Control de ortodoncia')
  on conflict do nothing;
  insert into public.appointments (patient_id, professional_id, branch_id, service_id, appointment_date, start_time, end_time, status, reason) values
    (v_pt2, v_prof1, v_branch_bagua, v_sv_conducto, v_monday, '09:30', '10:30', 'pending', 'Endodoncia unirradicular')
  on conflict do nothing;
  insert into public.appointments (patient_id, professional_id, branch_id, service_id, appointment_date, start_time, end_time, status, reason) values
    (v_pt3, v_prof1, v_branch_bagua, v_sv_revision, v_monday + 1, '09:00', '09:30', 'confirmed', 'Revisión y diagnóstico')
  on conflict do nothing;
  insert into public.appointments (patient_id, professional_id, branch_id, service_id, appointment_date, start_time, end_time, status, reason) values
    (v_pt4, v_prof1, v_branch_bagua, v_sv_limpieza, v_monday + 1, '14:00', '14:45', 'cancelled', 'Limpieza dental')
  on conflict do nothing;
  -- (v_monday+2 se evita a propósito: ya existe una excepción de prueba que
  -- cierra la sede Bagua todo ese día; se usa v_monday+3 en su lugar)
  insert into public.appointments (patient_id, professional_id, branch_id, service_id, appointment_date, start_time, end_time, status, reason) values
    (v_pt5, v_prof1, v_branch_bagua, v_sv_control_orto, v_monday + 3, '09:00', '09:30', 'confirmed', 'Control de ortodoncia')
  on conflict do nothing;
  insert into public.appointments (patient_id, professional_id, branch_id, service_id, appointment_date, start_time, end_time, status, reason) values
    (v_pt6, v_prof1, v_branch_chachapoyas, v_sv_revision, v_monday + 5, '08:00', '08:30', 'confirmed', 'Revisión y diagnóstico (sede Chachapoyas)')
  on conflict do nothing;

  -- Profesional 2 en Jaén (lunes a viernes de esta semana)
  insert into public.appointments (patient_id, professional_id, branch_id, service_id, appointment_date, start_time, end_time, status, reason) values
    (v_pt7, v_prof2, v_branch_jaen, v_sv_raspado, v_monday, '09:00', '09:45', 'confirmed', 'Raspado y alisado periodontal')
  on conflict do nothing;
  insert into public.appointments (patient_id, professional_id, branch_id, service_id, appointment_date, start_time, end_time, status, reason) values
    (v_pt8, v_prof2, v_branch_jaen, v_sv_primera_infantil, v_monday + 1, '10:00', '10:30', 'pending', 'Primera visita infantil')
  on conflict do nothing;
  insert into public.appointments (patient_id, professional_id, branch_id, service_id, appointment_date, start_time, end_time, status, reason) values
    (v_pt9, v_prof2, v_branch_jaen, v_sv_extraccion, v_monday + 2, '14:00', '14:40', 'confirmed', 'Extracción simple')
  on conflict do nothing;
  insert into public.appointments (patient_id, professional_id, branch_id, service_id, appointment_date, start_time, end_time, status, reason) values
    (v_pt10, v_prof2, v_branch_chiclayo, v_sv_raspado, v_monday + 5, '09:00', '09:45', 'confirmed', 'Raspado y alisado periodontal (sede Chiclayo)')
  on conflict do nothing;

  -- Citas pasadas ya completadas (semana anterior) — para historial / dashboard
  insert into public.appointments (patient_id, professional_id, branch_id, service_id, appointment_date, start_time, end_time, status, reason) values
    (v_pt1, v_prof1, v_branch_bagua, v_sv_control_orto, v_monday - 7, '09:00', '09:30', 'completed', 'Control de ortodoncia')
  on conflict do nothing;
  insert into public.appointments (patient_id, professional_id, branch_id, service_id, appointment_date, start_time, end_time, status, reason) values
    (v_pt2, v_prof1, v_branch_bagua, v_sv_conducto, v_monday - 5, '10:00', '11:00', 'completed', 'Tratamiento de conducto')
  on conflict do nothing;
  insert into public.appointments (patient_id, professional_id, branch_id, service_id, appointment_date, start_time, end_time, status, reason) values
    (v_pt7, v_prof2, v_branch_jaen, v_sv_raspado, v_monday - 6, '09:00', '09:45', 'completed', 'Raspado y alisado periodontal')
  on conflict do nothing;

  -- Próxima semana (más citas pendientes, para probar "Confirmar" en el admin)
  insert into public.appointments (patient_id, professional_id, branch_id, service_id, appointment_date, start_time, end_time, status, reason) values
    (v_pt5, v_prof1, v_branch_bagua, v_sv_revision, v_monday + 7, '09:00', '09:30', 'pending', 'Revisión y diagnóstico')
  on conflict do nothing;
  insert into public.appointments (patient_id, professional_id, branch_id, service_id, appointment_date, start_time, end_time, status, reason) values
    (v_pt9, v_prof2, v_branch_jaen, v_sv_primera_infantil, v_monday + 8, '10:00', '10:30', 'pending', 'Primera visita infantil')
  on conflict do nothing;

  raise notice 'Seed de datos de prueba completado.';
end $$;
