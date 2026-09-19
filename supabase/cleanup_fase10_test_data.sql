-- =============================================================================
-- Limpieza de datos de prueba de la FASE 10 (motor de disponibilidad)
-- =============================================================================
-- Ejecutar manualmente en el SQL Editor cuando quieras retirar los datos de
-- prueba antes de operar con datos reales. Está pensado para correrse tal
-- cual, en este orden (respeta las llaves foráneas).
--
-- NO borra la sede "KtristellDent Bagua" (es real) — solo sus filas de
-- horario/excepciones de prueba, para que puedas reemplazarlas por el
-- horario real desde /admin/sedes.
-- =============================================================================

-- 1. Citas de prueba (identificadas por el prefijo en "reason")
delete from public.appointments where reason like 'PRUEBA%';

-- 2. Excepciones de prueba
delete from public.schedule_exceptions where reason like 'PRUEBA%';

-- 3. Horario de prueba del profesional (Especialista A y B)
delete from public.professional_schedules
where professional_id in (
  select id from public.professionals where bio like 'PRUEBA%'
);

-- 4. Horario de prueba de la sede Bagua (real) — bórralo y configura el
--    horario REAL desde /admin/sedes antes de producción.
delete from public.branch_schedules
where branch_id = '80bd120f-0dff-4d90-b10c-3b97cab6755e';

-- 5. Asignaciones profesional-sede/especialidad/servicio de prueba
delete from public.professional_branches
where professional_id in (select id from public.professionals where bio like 'PRUEBA%');
delete from public.professional_specialties
where professional_id in (select id from public.professionals where bio like 'PRUEBA%');
delete from public.professional_services
where professional_id in (select id from public.professionals where bio like 'PRUEBA%');

-- 6. Fichas de profesional de prueba
delete from public.professionals where bio like 'PRUEBA%';

-- 7. Servicios y especialidad de prueba
delete from public.services where name like 'PRUEBA%';
delete from public.specialties where name like 'PRUEBA%';

-- 8. Pacientes de prueba (dni 900000xx)
delete from public.patients where dni like '9000%';

-- 9. Sede de prueba "KristellDent Jaen" (creada solo para esta prueba;
--    la real "Jaén" ya existía como referencia en data/branches.ts, esta
--    fila puede reemplazarse por la real cuando la crees desde /admin/sedes)
delete from public.branches where name = 'KristellDent Jaen';

-- 10. Cuenta y perfil del "Especialista B" de prueba (nunca recibió invitación
--     real por correo, se creó directo vía Admin API solo para esta prueba)
delete from public.profiles where email = 'prueba.especialista.b@kristelldent.test';
-- El borrado de auth.users debe hacerse desde el Dashboard
-- (Authentication → Users → buscar prueba.especialista.b@kristelldent.test →
-- Delete user), o con el Admin API — no es una tabla de public.*.
