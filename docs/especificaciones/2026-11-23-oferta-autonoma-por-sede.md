# KristellDent — Oferta autónoma por sede

**Especificación funcional y técnica para implementar**
Fecha: 23 nov 2026 (versión 2: sin catálogo global de servicios) · Proyecto SGCO-2026 · Repo KRISTELLDENT

---

## 1. Objetivo

Que cada sede registre y gestione **sus propios servicios** (nombre, especialidad, precio y duración), sus profesionales, qué atiende cada una y sus horarios, **sin afectar a las demás sedes**. La admin global ve y supervisa lo que ofrece cada sede, y también puede agregar o corregir servicios en cualquier sede.

No existe un catálogo global de servicios: la clínica no sabe de antemano qué brinda cada sede, así que cada sede lo declara. Las **especialidades** sí son una lista compartida, para que "Ortodoncia" sea la misma en todas las sedes y se pueda comparar.

Principios:

1. **Una persona, una cuenta, una ficha.** Nunca se crea otra cuenta para que alguien atienda en otra sede.
2. **Cada dato se guarda en un solo lugar.** Lo que se puede calcular no se guarda aparte.
3. **Autonomía con límite:** cada admin de sede gestiona todo lo de **su** sede y nada de otras.
4. **Las reglas viven en la base de datos** (RLS, restricciones, triggers y funciones), no solo en la pantalla.
5. **No se renombran tablas existentes** y no se crean tablas nuevas si una existente sirve.

---

## 2. Problemas que resuelve

1. Una admin de sede podía cambiar la especialidad y los servicios de una profesional, y el cambio se aplicaba en **todas** sus sedes.
2. Una sede no podía decidir qué servicios brinda ni a qué precio: el catálogo era único para todas.
3. La admin global tenía que crear servicios sin saber qué brinda cada sede.
4. Las sedes de una profesional se registraban en dos lugares (Equipo y Profesionales) que no coincidían.
5. No había forma de que una profesional que ya trabaja en una sede pase a atender en otra sin tocar la base a mano.
6. Una profesional podía tener una especialidad sin servicios y aparecer en la reserva sin poder atender ("No hay servicios disponibles").
7. La pantalla mostraba a la admin de sede opciones de sedes ajenas que la base rechazaba en silencio.

---

## 3. Decisiones tomadas

| # | Decisión |
|---|---|
| D1 | **Servicios por sede.** Cada servicio pertenece a una sola sede (`services.branch_id`). Lo crea y gestiona la admin de esa sede o la admin global. Dos sedes pueden tener servicios con el mismo nombre y distinto precio o duración; son servicios distintos. |
| D2 | **Especialidades compartidas.** `specialties` es una lista única para todas las sedes. La admin de sede y la admin global pueden **agregar** especialidades. El sistema impide duplicados por nombre (sin distinguir mayúsculas, tildes ni espacios) y, al escribir, muestra las parecidas para elegir una existente. **Renombrar, desactivar o borrar** una especialidad solo lo hace la admin global, porque afecta a todas las sedes. |
| D3 | No se guarda aparte qué especialidades tiene una sede: **se calculan**. Son las especialidades de sus servicios reservables (sección 6). |
| D4 | **Supervisión global.** La admin global ve en una sola pantalla qué especialidades y servicios ofrece cada sede, con precio, duración, profesionales y estado, y puede agregar, editar o desactivar servicios en cualquier sede. |
| D5 | Las sedes de una **profesional** se registran **solo en Profesionales** (`professional_branches`). Un trigger sincroniza el acceso en `user_branch_access`. En Equipo, sus sedes se ven en solo lectura. Las sedes de técnicas y administradoras se siguen editando en Equipo, también en cuentas ya existentes. |
| D6 | Autonomía de la admin de sede: crea, edita, activa o desactiva los servicios de su sede; agrega especialidades a la lista compartida; agrega profesionales existentes a su sede y las quita; decide qué servicios atiende cada profesional en su sede; gestiona horarios, ausencias y feriados de su sede. |
| D7 | Límites de la admin de sede: no toca servicios ni profesionales de otras sedes (las ve en solo lectura); no renombra ni desactiva especialidades; no cambia la especialidad de una **especialista** (afecta a todas sus sedes); sí puede **agregar** especialidades a una **odontóloga general**; no activa ni desactiva la ficha completa de una profesional (para eso la quita de su sede). |
| D8 | No se crean tablas nuevas. Se agregan columnas a `services`, `professional_services`, `specialties` y `appointments`. El nombre de la clínica es **KristellDent**. |

---

## 4. Modelo de datos

### 4.1 Tablas que no cambian de estructura

- `professionals`: ficha general (bio, `active`).
- `professional_specialties`: especialidades (cualificaciones) de cada profesional. Especialista: exactamente una (trigger `enforce_specialist_single_specialty` existente). Odontóloga general: varias.
- `professional_branches`: dónde atiende cada profesional. Pasa a ser **la única fuente** de sus sedes. Debe tener `unique (professional_id, branch_id)` (agregarla si no existe).
- `branch_schedules`, `professional_schedules`, `schedule_exceptions`.
- `user_branch_access`: accesos administrativos. Para roles profesionales se llena solo por trigger (D5).

### 4.2 `specialties` (lista compartida)

Columnas nuevas:

| Columna | Tipo | Regla |
|---|---|---|
| `name_key` | text generada | `translate(lower(btrim(regexp_replace(name, '\s+', ' ', 'g'))), 'áéíóúüñ', 'aeiouun')`, `stored`. |
| `created_by` | uuid FK → profiles null | quién la agregó |

Restricción: índice único sobre `name_key`. Mensaje de la base si choca: "Ya existe esa especialidad: elígela de la lista."

Antes de crear el índice, la migración lista en un comentario la consulta de duplicados actuales por `name_key` para unificarlos a mano.

### 4.3 `services` (servicios de cada sede)

Columnas nuevas:

| Columna | Tipo | Regla |
|---|---|---|
| `branch_id` | uuid FK → branches, on delete restrict | sede dueña del servicio. Null solo durante la migración (sección 9); `not null` en la fase 5. |
| `name_key` | text generada | misma fórmula que en `specialties`. |
| `created_by`, `updated_by` | uuid FK → profiles null | |

Se mantienen `name`, `specialty_id`, `price`, `duration_minutes` (`> 0` y `<= 480`), `active`. El precio y la duración del servicio **son** los de esa sede: no hay valores "por defecto" ni "locales".

Restricciones:

- `unique (branch_id, name_key)`: una sede no repite nombre. Mensaje: "Esta sede ya tiene un servicio con ese nombre."
- `unique (branch_id, id)`: necesaria para la FK compuesta de 4.4.
- Trigger: `specialty_id` debe apuntar a una especialidad activa al crear o cambiar.
- Borrar un servicio solo si ninguna cita lo usa (FK de `appointments` con `restrict`); si no, se desactiva.

### 4.4 `professional_services` (qué atiende cada profesional en cada sede)

Se reutiliza la tabla actual. Como cada servicio ya es de una sede, una fila `(professional_id, service_id)` significa "atiende este servicio en la sede del servicio".

Columnas nuevas y restricciones:

- `branch_id uuid`. Un trigger `before insert or update` la llena desde `services.branch_id`; nunca la escribe la app.
- `active boolean not null default true`.
- FK compuesta `(professional_id, branch_id)` → `professional_branches (professional_id, branch_id)` **on delete cascade**: la profesional debe atender en esa sede; si se la quita de la sede, se borran sus servicios ahí.
- FK compuesta `(branch_id, service_id)` → `services (branch_id, id)`.
- `unique (professional_id, service_id)` (ya existe o se agrega).
- Trigger de cualificación: rechaza la fila si la especialidad del servicio no está en `professional_specialties` de esa profesional. Mensaje: "La profesional no tiene la especialidad de este servicio."
- Trigger en `professional_specialties` (before delete): rechaza quitar una especialidad si la profesional tiene filas activas en `professional_services` con servicios de esa especialidad. Mensaje: "Primero quita sus servicios de esta especialidad en todas sus sedes."
- Si el Prompt S2 ya agregó un trigger de cualificación sobre esta tabla, se reutiliza.

### 4.5 Cambios en `appointments` (historial)

Columnas que guardan una copia al momento de reservar o reprogramar:

- `service_name text`
- `service_price numeric(10,2)`
- `service_duration_minutes integer`

Las llenan las funciones de reserva y reprogramación. Las citas existentes se completan con los valores actuales del servicio. Los reportes y el historial leen estas columnas.

---

## 5. Sincronización de sedes de profesionales (D5)

Trigger `SECURITY DEFINER` sobre `professional_branches`:

- **after insert:** si el perfil de la profesional tiene rol `especialista` u `odontologa_general`, inserta `(user_id, branch_id)` en `user_branch_access` (`on conflict do nothing`).
- **after delete:** borra ese `(user_id, branch_id)` de `user_branch_access`.

Trigger **before delete** sobre `professional_branches` (quitar a una profesional de una sede):

1. Si tiene citas en esa sede con estado `pending`, `confirmed` o `in_room` y fecha de hoy en adelante (hora de Lima), rechaza: "Tiene N citas pendientes en esta sede: reprográmalas o cancélalas antes de quitarla."
2. Si no, borra sus `professional_schedules` y `schedule_exceptions` de esa sede (sus `professional_services` de esa sede se borran por la FK en cascada).

Una cuenta no se duplica nunca. En Equipo, si se intenta crear una cuenta con un correo que ya existe: "Ese correo ya tiene una cuenta. Para que atienda en otra sede, agrégala en Profesionales."

---

## 6. Servicio reservable y especialidades de una sede

Un servicio es **reservable** cuando se cumple todo esto:

1. `services.active`, y su especialidad está activa.
2. La sede del servicio está activa.
3. Existe al menos una profesional que:
   - tiene la fila activa en `professional_services` para ese servicio,
   - tiene `professionals.active` y `profiles.active`,
   - tiene la especialidad del servicio en `professional_specialties`,
   - tiene al menos un horario en `professional_schedules` para esa sede.

Las **especialidades de una sede** son las especialidades de sus servicios reservables.

Funciones `SECURITY DEFINER`, `set search_path = ''`, con `grant execute` a `anon` y `authenticated` (solo devuelven datos públicos de la oferta):

- `get_branch_specialties(p_branch_id)` → especialidades con al menos un servicio reservable en esa sede.
- `get_bookable_services(p_branch_id, p_specialty_id default null, p_professional_id default null)` → id, nombre, especialidad, precio y duración.
- `get_bookable_professionals(p_branch_id, p_specialty_id default null, p_service_id default null)` → id y nombre de las profesionales que atienden algo reservable ahí.

Funciones para administración (`SECURITY DEFINER`, solo `admin_global` y `admin_sede`):

- `get_branch_offer_status(p_branch_id)` → por cada servicio de la sede: datos, profesionales asignadas, si es reservable y el motivo si no lo es. La admin_sede solo puede pedir sus sedes.
- `get_offer_overview()` → solo `admin_global`: por sede y especialidad, cuántos servicios tiene, cuántos son reservables y rango de precios. Alimenta la supervisión (10.2).

Motivos que se muestran cuando un servicio activo no es reservable:

- "No visible en reservas: falta asignar una profesional."
- "No visible en reservas: la profesional asignada no tiene horario en esta sede."
- "No visible en reservas: la especialidad está desactivada."

---

## 7. Permisos

### 7.1 Matriz

| Acción | Admin global | Admin de sede (solo sus sedes) | Especialista / odontóloga | Técnica | Público |
|---|---|---|---|---|---|
| Ver la lista de especialidades | Sí | Sí | Sí | Sí | Solo vía funciones de la sección 6 |
| Agregar una especialidad a la lista | Sí | Sí | No | No | No |
| Renombrar, desactivar o borrar una especialidad | Sí | No | No | No | No |
| Crear, editar, activar o desactivar servicios | Todas las sedes | Sí | No | No | No |
| Ver servicios de otras sedes | Sí | Solo lectura | Solo lectura | Solo lectura | Solo vía funciones |
| Supervisión de la oferta de todas las sedes | Sí | No | No | No | No |
| Agregar una profesional existente a la sede | Todas | Sí | No | No | No |
| Quitar una profesional de la sede | Todas | Sí | No | No | No |
| Qué servicios atiende cada profesional en la sede | Todas | Sí | No | No | No |
| Especialidad de una especialista | Sí | No | No | No | No |
| Agregar una especialidad a una odontóloga general | Sí | Sí, si atiende en su sede | No | No | No |
| Quitar una especialidad a una profesional | Sí | Sí, si no la usa en sedes ajenas (trigger 4.4) | No | No | No |
| Bio de la profesional | Sí | Sí, si atiende en su sede | No | No | No |
| Activar o desactivar la ficha completa | Sí | No (la quita de su sede) | No | No | No |
| Horarios, ausencias y feriados | Todas | Sí | No | No | No |
| Sedes de técnicas y admins (Equipo) | Todas | Solo agregar o quitar **su** sede a técnicas | No | No | No |

### 7.2 Políticas RLS (resumen)

- `specialties`:
  - select: `authenticated`.
  - insert: `is_admin_global() or current_user_role() = 'admin_sede'`, con `created_by = auth.uid()`.
  - update y delete: solo `is_admin_global()`.
- `services`:
  - select: `authenticated`.
  - insert y update: `is_admin_global() or (current_user_role() = 'admin_sede' and has_branch_access(branch_id))`, en `using` y en `with check` (impide pasar un servicio a otra sede).
  - delete: la misma condición (la FK de citas lo impide si está en uso).
- `professional_services`: escritura con la misma condición sobre `branch_id`.
- `professional_branches`:
  - insert: `is_admin_global() or (current_user_role() = 'admin_sede' and has_branch_access(branch_id))`. **Se quita la exigencia de compartir sede**, para que una admin pueda sumar a su sede a una profesional de otra sede.
  - delete: la misma condición sobre `branch_id`. Solo puede quitar **su** sede.
- `professional_specialties`:
  - insert: global, o admin_sede si la profesional es `odontologa_general` y comparte sede con ella.
  - delete: global, o admin_sede con la misma condición (el trigger 4.4 impide romper otras sedes).
- `professionals`: update de `bio` para global o admin_sede que comparte sede; update de `active` solo global (un trigger impide que admin_sede cambie `active`).
- `user_branch_access`: escritura de filas de profesionales solo por el trigger de la sección 5. Para técnicas: admin_global en todas, admin_sede solo filas de sus sedes.

### 7.3 Directorio de profesionales para la admin de sede

Para agregar a su sede a una profesional que hoy atiende en otra, la admin de sede necesita buscarla aunque no comparta sede con ella. Función `SECURITY DEFINER` `search_professionals_directory(p_query text)`, solo para `admin_global` y `admin_sede`, que devuelve por nombre: id, nombre, rol, especialidades y nombres de sus sedes actuales. Sin correo, teléfono ni citas.

---

## 8. Reserva, horarios y funciones existentes

- `get_available_slots`: devuelve vacío si el servicio no es de esa sede, no es reservable o la profesional no lo atiende (`professional_services` activa). Usa la duración del servicio.
- `create-public-appointment`: valida que el servicio sea de la sede elegida, reservable y atendido por esa profesional ("Este servicio no se brinda en esta sede."), y guarda la copia de 4.5.
- `reschedule_appointment` y `patient-appointments` (reprogramar): la misma validación.
- Pasos de la reserva:
  1. **Sede.**
  2. **Atención / especialidad:** `get_branch_specialties`.
  3. **Profesional:** `get_bookable_professionals`.
  4. **Servicio:** `get_bookable_services` con la profesional elegida, o todas si eligió "cualquier profesional".
  5. **Fecha y hora:** sin cambios.

---

## 9. Migración de datos

Hoy los servicios son globales. Hay que convertir cada servicio en uno por sede, sin perder citas ni asignaciones. Una migración que se pueda correr dos veces (`if not exists`, `on conflict do nothing`, comprobaciones antes de cada paso), en este orden:

1. **Consultas de revisión (comentario al inicio, se corren antes):**
   - especialidades duplicadas por `name_key`;
   - asignaciones `professional_services` cuya especialidad no tiene la profesional;
   - citas cuyo servicio está asignado a una profesional que ya no atiende en esa sede;
   - accesos de Equipo de profesionales a sedes donde no atienden (no se borran solos).
2. Columnas nuevas de la sección 4 (aún sin `not null` en `services.branch_id`).
3. **Calcular en qué sedes se usa cada servicio**, en una tabla temporal `service_branch_map (old_service_id, branch_id, new_service_id)`. Una sede usa un servicio si:
   - alguna profesional de esa sede (`professional_branches`) lo tiene en `professional_services`, o
   - hay citas de ese servicio en esa sede.
4. **Repartir:** para cada servicio, la primera sede de su lista (por nombre de sede) se queda con la fila original (`update services set branch_id`); para cada otra sede se inserta una copia con el mismo nombre, especialidad, precio, duración y `active`, y se guarda su id en el mapa.
5. **Reapuntar citas:** `appointments.service_id` al servicio de la sede de la cita, según el mapa. El trigger `guard_appointment_changes` puede bloquear este cambio: deshabilitarlo solo para este paso (`alter table appointments disable trigger guard_appointment_changes` y volver a habilitarlo al final del mismo archivo).
6. **Reapuntar asignaciones:** por cada fila de `professional_services` y cada sede de esa profesional donde exista copia, una fila con el servicio de esa sede; luego borrar las filas que quedaron apuntando a un servicio de otra sede. El trigger de 4.4 llena `branch_id`.
7. **Servicios sin uso** (sin sede en el mapa): quedan con `branch_id` null y `active = false`. Se listan en la supervisión como "Servicios sin sede" para que la admin global los asigne a una sede o los borre. En la fase 5 se agrega `not null`.
8. Sincronizar `user_branch_access` con `professional_branches` para perfiles con rol profesional (solo agregar).
9. Completar las columnas de copia en `appointments` desde el servicio de cada cita.
10. Crear los índices únicos de `name_key` después de los pasos anteriores.

Datos de prueba visibles ("PRUEBA - Odontologia General", "Nombre prueba"): se identifican y se tratan en la fase 5.

---

## 10. Pantallas

### 10.1 "Servicios de la sede" (reemplaza a la pantalla actual de Servicios)

- admin_sede: selector con sus sedes. admin_global: cualquier sede.
- Lista de los servicios **de esa sede**, agrupados por especialidad. Por servicio: nombre, especialidad, precio, duración, interruptor Activo, profesionales que lo atienden y estado reservable con su motivo (sección 6).
- Botón **"Nuevo servicio"**: nombre, especialidad (buscador sobre la lista compartida con la opción "Agregar especialidad"), precio y duración.
- "Agregar especialidad": al escribir muestra las parecidas ("¿Quisiste decir Ortodoncia?"). Si la base la rechaza por duplicada, muestra el mensaje y selecciona la existente.
- Arriba: "Especialidades de esta sede" (calculadas, solo lectura).

### 10.2 "Oferta por sede" (nueva, solo admin_global)

- Vista cruzada especialidad × sede: en cada celda, cuántos servicios reservables tiene esa sede de esa especialidad, o "—" si no la ofrece. Al hacer clic, abre "Servicios de la sede" de esa sede filtrada por esa especialidad.
- Lista de todos los servicios de todas las sedes, con filtros por sede, especialidad y estado, y botón "Nuevo servicio" (eligiendo la sede).
- Bloque "Servicios sin sede" (de la migración) con las acciones Asignar a una sede o Borrar.

### 10.3 Especialidades

- Todos los roles admin ven la lista compartida con "Sedes que la ofrecen" y "Agregada por".
- admin_sede: botón "Agregar especialidad" (con el aviso de parecidas). Sin editar ni desactivar.
- admin_global: además renombra, desactiva y borra (borrar solo si nada la usa).

### 10.4 Profesionales

- La lista de la admin_sede muestra las profesionales de sus sedes, con filtro por sede y especialidad.
- Botón **"Agregar profesional a mi sede"**: busca en el directorio (7.3) y agrega la sede elegida (de las suyas). Si la persona no existe, enlaza a "Nuevo profesional".
- Ficha de la profesional:
  - **Datos generales:** nombre, bio, rol y especialidades. Para la admin_sede, la especialidad de una especialista es de solo lectura; a una odontóloga general puede agregarle especialidades.
  - **Una pestaña por sede donde atiende:** servicios de esa sede que atiende (solo servicios activos de esa sede y de sus especialidades), botón Horario y botón **"Quitar de esta sede"** con confirmación y el mensaje de citas pendientes si aplica.
  - Para la admin_sede, las pestañas de sedes ajenas se ven en **solo lectura**, con la nota "No administras esta sede".
- "Activar / Desactivar ficha": solo admin_global.
- Marca **"Ficha incompleta"** si en alguna sede no tiene servicios u horario, indicando qué falta.

### 10.5 Equipo

- Profesionales: sus sedes en solo lectura, con la nota "Se asignan en Profesionales" y el botón "Ver ficha".
- Técnicas y administradoras: editar sedes en cuentas existentes (admin_sede solo puede agregar o quitar **sus** sedes a técnicas).
- Correo duplicado: el mensaje de la sección 5.
- Al crear una cuenta de especialista u odontóloga general (`create-internal-user`), crear también su ficha en `professionals` y sus `professional_branches` con las sedes elegidas.

### 10.6 Panel de la profesional y de la técnica

- Cada cita muestra su sede.
- Selector "Sede" ("Todas mis sedes" y cada una), solo si tiene más de una sede. Por defecto: la sede donde tiene horario hoy (hora de Lima); si son varias o ninguna, "Todas mis sedes".

---

## 11. Ajustes relacionados definidos el mismo día

1. **Proteger el rol admin_global:** no se crean cuentas `admin_global` desde la app (ni por la pantalla ni por un POST a `create-internal-user`), nadie se desactiva a sí mismo, y no se puede desactivar ni cambiar el rol de la última `admin_global` activa (trigger en `profiles`). El README explica cómo crear una admin global desde Supabase.
2. **Horario y ausencias en sedes ajenas:** solo lectura para la admin_sede (cubierto por 10.4).

---

## 12. Fases de implementación

| Fase | Contenido | Lista cuando |
|---|---|---|
| 1 · Base de datos | Secciones 4, 5, 6, 7.2, 7.3, 8 (backend) y 9. | Las consultas de verificación pasan, `npm test`, build y lint sin errores, y la reserva actual sigue funcionando con los datos migrados. |
| 2 · Admin: servicios, especialidades, supervisión y profesionales | Pantallas 10.1 a 10.4. | Escenarios 1 a 14. |
| 3 · Equipo y cuentas | Pantalla 10.5, `create-internal-user` y ajuste 11.1. | Escenarios 15 a 18. |
| 4 · Reserva y paneles | Pasos de la reserva con las funciones de la sección 6, copia en la cita y pantalla 10.6. | Escenarios 19 a 22. |
| 5 · Cierre | `services.branch_id not null`, quitar código que trate servicios como globales y tratar datos de prueba. | `grep` sin restos, todo sigue pasando. |

Migraciones: en el SQL Editor, una por archivo y en orden, y cada una se puede correr dos veces sin error (regla del `CLAUDE.md`).

---

## 13. Escenarios de prueba

| # | Escenario | Resultado esperado |
|---|---|---|
| 1 | Admin de Jaén crea "Control de ortodoncia" en Jaén con precio y duración | Existe solo en Jaén; Bagua no lo ve en su lista ni en la reserva. |
| 2 | Bagua crea un servicio con el mismo nombre y otro precio | Se permite; cada sede conserva su precio. |
| 3 | Jaén intenta crear otro "control de ortodoncia" en Jaén | Rechazado: la sede ya tiene un servicio con ese nombre. |
| 4 | Servicio activo en Jaén sin profesional asignada | La pantalla lo marca "no visible en reservas"; la reserva en Jaén no lo muestra. |
| 5 | Admin de Jaén asigna ese servicio a ANali en Jaén | Pasa a ser reservable en Jaén (si ANali tiene horario ahí). |
| 6 | Asignar a ANali un servicio de una especialidad que no tiene | La base lo rechaza. |
| 7 | Admin de Jaén agrega "Rehabilitación oral"; admin de Bagua escribe "rehabilitacion  oral" | A Bagua le aparece la existente; si insiste, la base lo rechaza por duplicada. |
| 8 | Admin de Jaén intenta renombrar o desactivar una especialidad | No puede (sin botones y RLS lo rechaza). |
| 9 | Admin de Jaén intenta crear o editar un servicio de Bagua | RLS lo rechaza; la pantalla lo muestra en solo lectura. |
| 10 | Admin global abre "Oferta por sede" | Ve qué especialidades y cuántos servicios reservables tiene cada sede. |
| 11 | Admin global crea un servicio en Chachapoyas | Aparece en Chachapoyas; la admin de esa sede lo ve y puede editarlo. |
| 12 | Admin de Jaén agrega a su sede a una profesional que atiende solo en Bagua | Se agrega; su cuenta recibe acceso a Jaén; sigue igual en Bagua. |
| 13 | Admin de Jaén quita a una profesional de Jaén, sin y con una cita pendiente futura | Sin citas: se quita solo Jaén con su horario y servicios de Jaén. Con cita: rechazado con el mensaje de citas pendientes. |
| 14 | Admin de Jaén intenta cambiar la especialidad de una especialista | No puede (solo lectura y RLS lo rechaza). |
| 15 | Crear una cuenta de especialista desde Equipo | Se crea la cuenta y su ficha con sus sedes; aparece "Ficha incompleta". |
| 16 | Crear una cuenta con un correo que ya existe | Mensaje: agregarla en Profesionales. No se duplica. |
| 17 | Editar las sedes de una técnica existente | admin_global: cualquiera; admin_sede: solo las suyas. |
| 18 | Crear una admin_global por la app o por un POST a la función | Rechazado. |
| 19 | Reserva en Jaén | Solo especialidades, profesionales y servicios reservables de Jaén, con precio y duración de Jaén. |
| 20 | POST directo para reservar en Jaén un servicio de Bagua o uno desactivado | Rechazado por el servidor. |
| 21 | Cambiar el precio de un servicio después de reservar | La cita conserva el nombre y el precio del momento de la reserva. |
| 22 | Profesional con dos sedes entra a su panel | Ve la sede de cada cita y puede filtrar por sede. |

---

## 14. Fuera de alcance (por ahora)

- Catálogo global o plantillas de servicios.
- Botón "Copiar servicios desde otra sede" (se puede agregar después si la clínica lo pide).
- Auditoría completa (`audit_logs`) y detección de ediciones simultáneas.
- Especialidades habilitadas por sede guardadas aparte.
