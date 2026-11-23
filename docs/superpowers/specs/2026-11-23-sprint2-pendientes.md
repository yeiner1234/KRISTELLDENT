# Pendientes del Sprint 2 — spec aprobada

Diseño aprobado por el usuario (prompt de cierre de pendientes del Sprint 2). Rama: `sprint2/pendientes`, creada desde `main` (el usuario pidió este nombre en lugar de `sprint3/<prompt>`).

## HU Gestión de sedes
1. **Región obligatoria** (criterio 1: nombre, dirección y región). En el formulario de Sedes, "Región / ciudad" deja de ser opcional. En la base, `branches.region` hoy admite null: agregar `check (region is not null and btrim(region) <> '') NOT VALID` para no romper sedes viejas, y en un comentario dejar la consulta que lista las sedes sin región.
2. **No desactivar una sede con citas pendientes** (caso límite 1). Trigger BEFORE UPDATE en `branches`: si `active` pasa de true a false y la sede tiene citas en `pending`, `confirmed` o `in_room` con fecha de hoy en adelante (hora de Lima), lanza "No se puede desactivar: la sede tiene N citas pendientes." La pantalla muestra ese mensaje.

## HU Especialidades y servicios
3. **No desactivar una especialidad con servicios activos** (caso límite 1). Trigger BEFORE UPDATE en `specialties` con el mismo patrón: "Tiene N servicios activos: desactívalos primero." Mensaje en pantalla.
4. **Usabilidad:** en Servicios, la lista se muestra agrupada por especialidad (un encabezado por especialidad y sus servicios debajo), sin perder el filtro ni la búsqueda.

## HU Gestión de profesionales
5. **Al menos una sede y una especialidad** (criterio 1). El formulario exige al menos una sede activa y, para especialista, una especialidad (para odontóloga general ya exige al menos un servicio). Validarlo también en `professionalService` antes de escribir.
6. **Servicio de una especialidad que no tiene** (caso límite 1). La pantalla ya lo filtra; agregarlo en la base con un trigger en `professional_services` que rechace el servicio si su `specialty_id` no está en `professional_specialties` de ese profesional. Revisar el orden de `replaceRelations`: insertar especialidades antes que servicios y borrar servicios antes que especialidades.
7. **Usabilidad:** en Profesionales, filtro por sede junto al de especialidad.

## HU Gestión de horarios y excepciones
8. **Horario del profesional dentro del de la sede** (criterio 2). Hoy el modal solo avisa: debe impedir guardar. Bloquearlo en la pantalla, en `professionalScheduleService` y con un trigger en `professional_schedules` que compare con `branch_schedules` de esa sede y día: "El horario del profesional debe estar dentro del horario de la sede."
9. **Sin cruces entre sedes el mismo día** (caso límite 2). Restricción de exclusión en `professional_schedules`: `exclude using gist (professional_id with =, day_of_week with =, tsrange('2000-01-01'::date + start_time, '2000-01-01'::date + end_time) with &&)`. Traducir el error a "Ese horario se cruza con su horario en otra sede."

Todo el SQL en una sola migración nueva que se pueda correr dos veces. Antes de los puntos 8 y 9, dejar en comentarios las consultas que muestran los horarios actuales que violarían esas reglas, para que el usuario los corrija antes de aplicarla.

## Verificación (lista al final)
- Crear una sede sin región: no deja.
- Desactivar una sede con una cita pendiente futura: mensaje y sigue activa.
- Desactivar una especialidad con un servicio activo: mensaje y sigue activa.
- Servicios se ve agrupado por especialidad.
- Guardar un especialista sin sede o sin especialidad: no deja.
- Profesionales se filtra por sede y por especialidad.
- Un horario 07:00–12:00 en una sede que abre a las 08:00: no deja guardar.
- Lunes 09:00–13:00 en Bagua y lunes 12:00–16:00 en Jaén para la misma profesional: el segundo no se guarda.
- `npm test`, `npm run build` y `npm run lint` sin errores. Commits por punto. Decir qué migración pegar en el SQL Editor.

## Decisiones tomadas al planificar
- Una sola migración `20261123000000_sprint2_pendientes.sql`; cada commit agrega la sección de su punto.
- Triggers con `security definer` y `search_path = ''` (como `enforce_specialist_single_specialty`): deben contar citas, servicios y horarios aunque la RLS de quien llama no los deje ver.
- La restricción de exclusión no admite `NOT VALID`: si hay cruces actuales, la migración falla al llegar al punto 9. Por eso las consultas de revisión van primero, en comentarios.
- Punto 8 y sede cerrada ese día: también se rechaza (el horario no puede estar dentro de un horario que no existe). Mismo mensaje.
- El trigger del punto 8 solo mira inserciones y cambios del horario del profesional; cambiar después el horario de la sede no revisa los horarios ya cargados (fuera de alcance).
- Punto 5 en el servicio: sin sedes o sin especialidades se rechaza antes de escribir. El servicio no conoce qué sedes están activas; esa parte la valida el formulario.
- Punto 9: la traducción va en `friendlyWriteError` (busca el nombre de la restricción `professional_schedules_no_overlap`).
