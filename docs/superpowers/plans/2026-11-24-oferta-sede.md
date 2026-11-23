# Plan — Oferta autónoma por sede (fases 1 a 5)

Spec: `docs/especificaciones/2026-11-23-oferta-autonoma-por-sede.md`.

Ramas (apiladas, porque `main` todavía no tiene S2 ni la sede del panel):

- `oferta-sede/fase1-bd` = `main` + `sprint2/pendientes` + `sprint3/sede-panel-profesional` + fase 1.
- `oferta-sede/fase2-admin` desde fase 1, `oferta-sede/fase3-equipo` desde fase 2, `oferta-sede/fase4-reserva` desde fase 3, `oferta-sede/fase5-cierre` desde fase 4.

La pantalla 10.6 (sede en el panel profesional y de la técnica) ya está hecha en `sprint3/sede-panel-profesional`.

## Fase 1 · Base de datos

Migraciones (en orden):

1. `20261124000000_oferta_sede_estructura.sql` — columnas, triggers, FK compuestas y RLS.
2. `20261124000100_oferta_sede_funciones.sql` — funciones de oferta, directorio, `get_available_slots`, `reschedule_appointment`.
3. `20261124000200_oferta_sede_datos.sql` — reparto de servicios por sede (un solo bloque DO).
4. `20261124000300_oferta_sede_indices_nombre.sql` — índices únicos por nombre.

Edge Functions: `create-public-appointment` y `patient-appointments` validan con `is_bookable_service` y leen la copia del servicio en la cita (`serviceOfferError`, `serviceSnapshot`, probadas con Vitest).

### Comprobación manual de cada regla (SQL Editor)

Para simular un usuario dentro del SQL Editor:

```sql
begin;
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '<uuid del usuario>', 'role', 'authenticated')::text, true);
-- ... la prueba ...
rollback;
```

| Regla | Consulta | Esperado |
|---|---|---|
| Servicio de otra sede rechazado en la reserva | `select public.is_bookable_service('<jaen>', '<servicio de bagua>', '<profesional>');` | `false` |
| Slots vacíos con servicio de otra sede | `select * from public.get_available_slots('<profesional>', '<jaen>', '<servicio de bagua>', current_date + 1);` | 0 filas |
| Nombre repetido en la misma sede | `insert into public.services (branch_id, specialty_id, name, duration_minutes, price) values ('<jaen>', '<esp>', 'control  de ORTODONCIA', 30, 50);` cuando ya existe "Control de ortodoncia" en Jaén | Error "Esta sede ya tiene un servicio con ese nombre." |
| Mismo nombre en otra sede | El mismo insert con `'<bagua>'` | Se inserta |
| Especialidad duplicada | `insert into public.specialties (name) values ('rehabilitacion  oral');` con "Rehabilitación oral" existente | Error "Ya existe esa especialidad: elígela de la lista." |
| Cualificación | `insert into public.professional_services (professional_id, service_id) values ('<anali>', '<servicio de una especialidad que no tiene>');` | Error "La profesional no tiene la especialidad de este servicio." |
| Quitar especialidad en uso | `delete from public.professional_specialties where professional_id = '<anali>' and specialty_id = '<esp que usa>';` | Error "Primero quita sus servicios de esta especialidad en todas sus sedes." |
| Quitar de sede con citas | Con una cita `pending` futura en Jaén: `delete from public.professional_branches where professional_id = '<p>' and branch_id = '<jaen>';` | Error "Tiene 1 cita pendiente en esta sede…" |
| Quitar de sede sin citas | El mismo delete sin citas | Se borra la sede, su horario, sus excepciones y sus `professional_services` de esa sede; las de otras sedes siguen |
| Sincronización de accesos | `insert into public.professional_branches (professional_id, branch_id) values ('<p>', '<jaen>');` y luego `select * from public.user_branch_access where user_id = '<p>';` | Aparece Jaén; al borrar la fila, desaparece |
| Servicio reservable | `select * from public.get_branch_offer_status('<jaen>');` como admin de Jaén | Cada servicio con `bookable` y `reason` |
| RLS admin_sede sobre otra sede | Como admin de Jaén: `update public.services set price = 1 where id = '<servicio de bagua>';` | `UPDATE 0` (RLS) |
| RLS: mover servicio a otra sede | Como admin de Jaén: `update public.services set branch_id = '<bagua>' where id = '<servicio de jaen>';` | Error (trigger "Un servicio no cambia de sede" o RLS) |
| admin_sede no renombra especialidades | Como admin de Jaén: `update public.specialties set name = 'X' where id = '<esp>';` | `UPDATE 0` |
| admin_sede no cambia la especialidad de una especialista | Como admin de Jaén: `delete from public.professional_specialties where professional_id = '<especialista>';` | `DELETE 0` |
| admin_sede no desactiva la ficha | Como admin de Jaén: `update public.professionals set active = false where id = '<p de su sede>';` | Error "Solo la administradora global…" |
| Ninguna cita apunta a otra sede | `select a.id from public.appointments a join public.services s on s.id = a.service_id where s.branch_id is distinct from a.branch_id;` | 0 filas |
| Copia del servicio en la cita | `update public.services set price = price + 10 where id = '<s>';` y mirar `service_price` de sus citas | No cambia |

## Fase 2 · Admin

Pantallas 10.1 a 10.4. Servicios nuevos en `src/services/offerService.ts` (RPC de oferta, directorio y especialidades del panel) y cambios en `serviceService`, `specialtyService` y `professionalService`. Pruebas con Vitest y React Testing Library. Escenarios 1 a 14 como pruebas manuales.

## Fase 3 · Equipo y cuentas

10.5, `create-internal-user` (crea ficha y sedes para roles profesionales, 403 para admin_global) y 11.1 (migración `20261124000400_proteger_admin_global.sql`).

## Fase 4 · Reserva

Pasos de la reserva con `get_branch_specialties`, `get_bookable_professionals` y `get_bookable_services`; historial con la copia de la cita.

## Fase 5 · Cierre

`services.branch_id not null` (migración `20261124000500_servicios_sede_obligatoria.sql`), limpieza de código global, consulta de datos de prueba y `docs/verificacion-oferta-sede.md`.
