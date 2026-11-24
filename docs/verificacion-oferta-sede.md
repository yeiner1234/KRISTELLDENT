# Verificación — Oferta autónoma por sede

Spec: `docs/especificaciones/2026-11-23-oferta-autonoma-por-sede.md` (sección 13).

**Antes de empezar:** migraciones `20261124000000` a `20261124000500` aplicadas, Edge Functions desplegadas, y estas cuentas: admin global, admin de Jaén (solo Jaén), admin de Bagua (solo Bagua), la especialista ANali (especialidad Ortodoncia, atiende en Jaén con horario) y una profesional que atiende solo en Bagua. Usa una ventana privada por cuenta.

En **Resultado** anota OK o lo que pasó.

| # | Cuenta | Pasos en la app | Resultado esperado | Resultado |
|---|---|---|---|---|
| 1 | Admin Jaén | Servicios de la sede → Sede: Jaén → Nuevo servicio → Nombre "Control de ortodoncia", Especialidad: Ortodoncia, Precio 80, Duración 30 → Guardar. Luego entra como admin Bagua → Servicios de la sede, y abre /reservar → Bagua. | El servicio aparece en Jaén. Bagua no lo ve en su lista ni en la reserva. | |
| 2 | Admin Bagua | Servicios de la sede → Nuevo servicio → "Control de ortodoncia", Ortodoncia, Precio 95, Duración 40 → Guardar. Revisa Jaén como admin global (Oferta por sede → Todos los servicios). | Se crea. Jaén sigue con S/ 80 y 30 min; Bagua con S/ 95 y 40 min. | |
| 3 | Admin Jaén | Nuevo servicio → Nombre "control  de ORTODONCIA" (otro caso y espacios), Ortodoncia, precio 50 → Guardar. | Mensaje "Esta sede ya tiene un servicio con ese nombre." No se crea. | |
| 4 | Admin Jaén | Crea "Retenedor" (Ortodoncia, activo) sin asignarlo a nadie. Mira su fila. Abre /reservar → Jaén → Ortodoncia → Cualquier profesional. | Columna "En la reserva": "No visible en reservas: falta asignar una profesional." La reserva no muestra "Retenedor". | |
| 5 | Admin Jaén | Profesionales → ANali → Editar → pestaña Jaén → marca "Retenedor" → Guardar servicios. Vuelve a Servicios de la sede y a /reservar → Jaén. | "Retenedor" pasa a "Visible en reservas" y aparece en la reserva de Jaén (si ANali tiene horario en Jaén; si no, el motivo dice que falta horario). | |
| 6 | Admin global | En Jaén crea "Conducto" de Endodoncia. Profesionales → ANali (Ortodoncia) → pestaña Jaén. Prueba también en SQL: `insert into public.professional_services (professional_id, service_id) values ('<ANali>', '<Conducto>');` | En la ficha no aparece "Conducto" (no es de su especialidad). El insert falla con "La profesional no tiene la especialidad de este servicio." | |
| 7 | Admin Jaén → Admin Bagua | Jaén: Especialidades → Agregar especialidad → "Rehabilitación oral" → Guardar. Bagua: Especialidades → Agregar especialidad → escribe "rehabilitacion  oral". Prueba también desde Nuevo servicio → buscador de especialidad. | A Bagua le aparece "Ya existe "Rehabilitación oral"" y no deja guardar; en el buscador sale "¿Quisiste decir Rehabilitación oral?". Si se fuerza por SQL, la base responde "Ya existe esa especialidad: elígela de la lista." | |
| 8 | Admin Jaén | Especialidades. Luego en SQL, como admin Jaén (ver plan): `update public.specialties set name = 'X' where id = '<id>';` | No hay botones Editar, Desactivar ni Borrar. El update afecta 0 filas. | |
| 9 | Admin Jaén | Servicios de la sede: el selector de sede solo tiene Jaén. En SQL, como admin Jaén: `update public.services set price = 1 where id = '<servicio de Bagua>';` | No puede elegir Bagua. El update afecta 0 filas (RLS). En la ficha de una profesional, la pestaña Bagua se ve en solo lectura. | |
| 10 | Admin global | Menú → Oferta por sede. | Tabla especialidad × sede con el número de servicios visibles en reservas ("—" si no la ofrece). Clic en una celda abre Servicios de la sede filtrado por esa sede y especialidad. | |
| 11 | Admin global → Admin Chachapoyas | Oferta por sede → Nuevo servicio → Sede: Chachapoyas → datos → Guardar. Entra como admin de Chachapoyas → Servicios de la sede → Editar ese servicio. | Aparece en Chachapoyas y su admin puede editarlo. | |
| 12 | Admin Jaén | Profesionales → Agregar profesional a mi sede → busca a la profesional de Bagua → "Agregar a Jaén". Abre su ficha. En Equipo, revisa sus sedes. | Queda con Bagua y Jaén; en la ficha aparece la pestaña Jaén con "Ficha incompleta" hasta que tenga servicios y horario. En Equipo sus sedes muestran Jaén (acceso dado por la base). Bagua no cambió. | |
| 13 | Admin Jaén | a) Sin citas: ficha de esa profesional → pestaña Jaén → Quitar de esta sede → Sí, quitar. b) Con una cita pendiente futura en Jaén: repite. | a) Se quita solo Jaén, con su horario y sus servicios de Jaén; Bagua sigue igual. b) Mensaje "Tiene 1 cita pendiente en esta sede: reprográmala o cancélala antes de quitarla." | |
| 14 | Admin Jaén | Profesionales → ANali (especialista) → Datos generales. En SQL, como admin Jaén: `delete from public.professional_specialties where professional_id = '<ANali>';` | La especialidad se ve en solo lectura con la nota "Solo la administración general cambia la especialidad…". El delete afecta 0 filas. | |
| 15 | Admin global | Equipo → Invitar usuario → rol Especialista, sede Jaén → Enviar. Ve a Profesionales. | Se envía la invitación; la nueva cuenta aparece en Profesionales con su ficha en Jaén y la marca "Ficha incompleta" (falta especialidad, servicios y horario). | |
| 16 | Admin global | Equipo → Invitar usuario con el correo de una cuenta existente (con otras mayúsculas o espacios). | Mensaje "Ese correo ya tiene una cuenta. Para que atienda en otra sede, agrégala en Profesionales." No se crea nada. | |
| 17 | Admin global y admin Jaén | Equipo → tarjeta de una técnica → Editar sedes. | Admin global: puede marcar cualquier sede. Admin Jaén: solo Jaén está habilitada; las demás aparecen "(no la administras)". | |
| 18 | Admin global | Equipo → Invitar usuario → lista Rol. Luego el POST directo de la nota 2 (abajo) con `"role": "admin_global"`. En SQL intenta desactivar a la única admin global. | El rol "Administrador global" no está. La función responde 403 "Una administradora global no se crea desde la app…". La base responde "No se puede desactivar ni cambiar el rol de la última administradora global activa." | |
| 19 | Paciente (sin sesión) | /reservar → Jaén → "Sé qué especialidad necesito". Sigue hasta Servicio. | Solo especialidades con servicios visibles en Jaén; solo profesionales que atienden ahí; servicios con precio y duración de Jaén. | |
| 20 | Paciente (sin sesión) | El POST directo de la nota 1 (abajo) con `branchId` de Jaén y `serviceId` de un servicio de Bagua; luego con un servicio desactivado de Jaén. | Respuesta 400 "Este servicio no se brinda en esta sede." en ambos casos. | |
| 21 | Admin Jaén | Reserva una cita en Jaén. Después cambia el precio y el nombre de ese servicio. Abre la cita en Citas → Ver detalle, y en /mis-citas con DNI + código. | La cita sigue mostrando el nombre y el precio del momento de la reserva. | |
| 22 | Profesional con dos sedes | Entra a /profesional. | Cada cita muestra su sede; aparece el selector "Sede" (Todas mis sedes / cada sede) y por defecto la sede donde tiene horario hoy. | |

## Notas para los POST directos

1. **Reserva (escenario 20).** Con la clave publicable del proyecto (`VITE_SUPABASE_PUBLISHABLE_KEY` de `.env.local`) y una fecha y hora futuras:

```bash
curl -i -X POST "https://<PROJECT_REF>.supabase.co/functions/v1/create-public-appointment" \
  -H "apikey: <CLAVE_PUBLICABLE>" -H "Content-Type: application/json" \
  -d '{"dni":"12345678","firstName":"Prueba","lastName":"Directa","email":"prueba@correo.pe","phone":"987654321",
       "professionalId":"<PROFESIONAL>","branchId":"<JAEN>","serviceId":"<SERVICIO_DE_BAGUA>",
       "date":"2026-12-01","startTime":"09:00","reason":"prueba"}'
```

2. **Cuenta admin_global (escenario 18).** Con la sesión de la admin global abierta, copia su `access_token` (DevTools → Application → Local Storage → clave `sb-<PROJECT_REF>-auth-token`):

```bash
curl -i -X POST "https://<PROJECT_REF>.supabase.co/functions/v1/create-internal-user" \
  -H "apikey: <CLAVE_PUBLICABLE>" -H "Authorization: Bearer <ACCESS_TOKEN>" -H "Content-Type: application/json" \
  -d '{"email":"nueva@correo.pe","fullName":"Nueva Global","role":"admin_global","branchIds":["<JAEN>"]}'
```

3. **Consultas "como admin de Jaén" (escenarios 8, 9 y 14).** En el SQL Editor, dentro de una transacción que se deshace:

```sql
begin;
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '<UUID_ADMIN_JAEN>', 'role', 'authenticated')::text, true);
-- la consulta del escenario
rollback;
```
