# Sprint 3 — Guía de verificación manual (HU09–HU12)

Llena la columna **Resultado** con ✅, ❌ o una nota. Las filas marcadas con **⚠ Nota** son puntos que, al recorrer el código, no se ven implementados por completo o no se pueden comprobar desde el código.

## Antes de empezar

1. Aplica todas las migraciones y despliega las tres Edge Functions (ver README).
2. Prepara estos datos desde `/admin` con un **admin global**:
   - **Sede A** activa con horario lunes a sábado 08:00–20:00. **Sede B** activa con otro horario.
   - **Dra. Ana** (especialista, Endodoncia): solo en Sede A, horario semanal **lunes 09:00–13:00** en Sede A, con un servicio **Endodoncia 45 min**.
   - **Dra. Bea** (especialista, Endodoncia): solo en Sede B, con horario en Sede B.
   - Una **técnica** y un **admin de sede** con acceso solo a Sede A.
   - Usa como "lunes de prueba" el próximo lunes (a partir de hoy, hora de Lima).
3. Ten a mano dos navegadores (o una ventana normal y una privada) para los casos de dos personas a la vez.

---

## HU09 — Consulta de disponibilidad

| # | Criterio / caso límite | Paso exacto | Resultado esperado | Resultado |
|---|---|---|---|---|
| C1 | La disponibilidad se filtra por sede, servicio y profesional | Sin sesión: `/reservar` → Sede A → Endodoncia → "Elegir profesional". Repite eligiendo Sede B. | En Sede A solo sale Dra. Ana; en Sede B solo Dra. Bea. En el paso de servicio solo salen los servicios que ofrece la profesional elegida. | |
| C1b | Filtro con "Cualquier profesional" | `/reservar` → Sede A → Endodoncia → "Cualquier profesional disponible" → Endodoncia 45 min → elige el lunes de prueba. | Los horarios son solo de profesionales de Endodoncia que atienden en Sede A (bajo cada hora sale el nombre de la profesional). | |
| C2 | Solo se muestran horarios libres del profesional | Reserva el lunes de prueba a las 09:00 con Dra. Ana. Vuelve a `/reservar` con el mismo profesional, servicio y fecha. | 09:00 ya no aparece (ni las horas que se cruzan con 09:00–09:45). | |
| C3 | Los horarios respetan la duración del servicio | Dra. Ana, Endodoncia 45 min, lunes de prueba (sin otras citas). | Salen 09:00, 09:30 … 12:00. **No** sale 12:30 (terminaría 13:15). | |
| CL1 | Ocultar horarios bloqueados por una excepción | Admin → Profesionales → Dra. Ana → Horario → pestaña "Ausencias y turnos extra" → No disponible, lunes de prueba, desmarcar "Todo el día", 10:00–11:00 → Agregar. Revisa los horarios en `/reservar`. | Desaparecen las horas que se cruzan con 10:00–11:00 (09:30, 10:00, 10:30). Borra la excepción después: pide confirmación "¿Borrar?" antes de borrarla. | |
| CL1b | Feriado de la sede | Admin → Sedes → Sede A → "Feriados y cierres" → agrega el lunes de prueba. | En `/reservar` ese día queda sin horarios. Al borrar el feriado pide confirmación. | |
| CL2 | Mensaje sin horarios en la fecha | Elige un día en que Dra. Ana no atiende (por ejemplo, martes). | Sale "No hay horarios disponibles" (no una ruedita). | |
| U1 | Los horarios se muestran en un calendario | Paso de fecha y hora. | Calendario mensual; días pasados (hora de Lima) y días con la sede cerrada aparecen deshabilitados. | |
| A1 | Modal Horario: solo sedes activas | Desactiva Sede B. Abre Horario de una profesional asignada a Sede A y Sede B. | El selector "Sede" solo lista Sede A y abre en ella. En "Turno extra", "Sede del turno extra" solo lista sedes activas y viene con la primera elegida. | |
| A2 | Modal Horario: validación | Lunes con bloque 13:00–09:00 → Guardar horario. Luego cambia cualquier hora. | Aparece el error a la vista (sube el scroll hasta él); al editar un bloque, el error desaparece. Nada se guarda con el error. | |
| A3 | Error de permisos | Como admin de sede de Sede A, intenta guardar un horario o una excepción de una sede ajena (si la pantalla no lo permite, prueba con una sede de la que se quitó el acceso con el modal abierto). | Mensaje "No tienes permiso para modificar esta sede." (no el texto técnico de Supabase). | |
| A4 | "Cualquier profesional" sin profesionales | `/reservar` → una sede sin profesionales de la especialidad → Cualquier profesional. | En el paso de servicio: "No hay profesionales de esta especialidad en esta sede." | |
| A5 | Iconos de especialidad | Mira `/` (sección Especialidades) y el paso "Elige una especialidad". | Ortodoncia, Endodoncia, Periodoncia, Odontopediatría y Cirugía tienen su propio icono; las demás, la carita. | |

## HU10 — Reserva de citas

| # | Criterio / caso límite | Paso exacto | Resultado esperado | Resultado |
|---|---|---|---|---|
| C1 | Reserva sin crear cuenta | Sin sesión, recorre `/reservar` completo. | En ningún paso pide crear cuenta ni contraseña. | |
| C2 | Datos del paciente | Paso "Tus datos": deja campos vacíos o inválidos (DNI de 7 dígitos, correo sin @, teléfono de 8 dígitos). | Pide DNI (8 dígitos), nombres, apellidos, correo y teléfono (9 dígitos) y no avanza con datos inválidos. El servidor también los rechaza. | |
| C3 | Código de la cita | Confirma una reserva. | La pantalla de éxito muestra el código `KD-XXXXXX` grande, con botón **Copiar** y el texto "Guárdalo: con tu DNI y este código puedes reprogramar o cancelar tu cita". El enlace de WhatsApp incluye el código. | |
| C3b | Correo con el código | Con `RESEND_API_KEY` y `EMAIL_FROM` configurados, reserva con tu correo. | Llega el correo con código, fecha, hora, sede, profesional, servicio y enlace a `/consultar-citas`; la pantalla dice "También te enviamos el código a tu correo". Sin esos secretos, la reserva se confirma igual y ese texto no sale. | |
| CL1 | Dos pacientes, mismo horario a la vez | Dos navegadores, dos DNI distintos, misma profesional/fecha/hora. Llega al paso Confirmar en ambos y pulsa Confirmar en los dos. | Uno se confirma; el otro ve "Ese horario ya no está disponible. Elige otro." | |
| CL2 | Mismo paciente, dos citas a la misma hora | Con el mismo DNI, reserva el lunes de prueba 09:00 con Dra. Ana y luego, a la misma hora, con otra profesional u otra sede. | La segunda falla con "Ya tienes una cita que se cruza con ese horario." | |
| CL3 | DNI ya registrado | Reserva otra vez con un DNI existente pero con otro nombre y correo. | La cita se crea; los datos guardados del paciente no se sobrescriben. | |
| NF | Confirmación en menos de 3 s | Pulsa Confirmar y mide (DevTools → Network, llamada `create-public-appointment`). | Responde en menos de 3 s. **⚠ Nota:** no se puede comprobar desde el código; solo midiendo. | |
| U1 | Pasos cortos / sin doble envío | Pulsa Confirmar dos veces seguidas. | El botón se deshabilita ("Confirmando…") y se crea una sola cita. | |
| E1 | Error visible | Sin conexión (DevTools → Offline), pulsa Confirmar. | Se muestra un mensaje de error; el botón vuelve a estar disponible. | |

## HU11 — Reprogramación y cancelación

| # | Criterio / caso límite | Paso exacto | Resultado esperado | Resultado |
|---|---|---|---|---|
| C1 | DNI y código | `/consultar-citas`: escribe DNI y código de una cita (prueba también el código en minúsculas o sin "KD-"). | Entra a `/mis-citas` con todas las citas del paciente. El DNI y el código no aparecen en la URL. | |
| C2 | Reprogramar muestra solo horarios libres | En `/mis-citas`, Reprogramar una cita pendiente → elige fecha. | Solo salen horarios libres de la misma profesional, sede y servicio; la hora actual de la cita sí puede salir (se excluye a sí misma). Al confirmar, la tarjeta muestra la nueva fecha y hora. | |
| C3 | Cancelar libera el horario | Cancela una cita (pide confirmación). En otro navegador, sin sesión, busca esa misma profesional, servicio y fecha en `/reservar`. | La cita pasa a Cancelada y su hora vuelve a aparecer disponible. | |
| CL1 | No se reprograma ni cancela una cita atendida | Con el admin, marca una cita como atendida (Confirmar → Marcar llegada → Marcar como atendida). Ábrela en `/mis-citas`. | No muestra Reprogramar ni Cancelar. Si se fuerza la llamada, el servidor responde con el mensaje del trigger. | |
| CL1b | Citas pasadas | Una cita de una fecha pasada en `/mis-citas`. | No muestra Reprogramar ni Cancelar. | |
| CL2 | Código que no corresponde al DNI | En `/consultar-citas`, DNI de un paciente y código de la cita de otro. | "El DNI y el código no coinciden." (el mismo mensaje si el DNI o el código no existen). | |
| U1 | Una sola pantalla | `/mis-citas` con un paciente de varias citas. | Todas las citas en una pantalla, cada una con código, fecha, hora, sede, profesional, servicio y estado. | |
| E1 | Recargar `/mis-citas` | Pulsa F5 en `/mis-citas`. | Vuelve a `/consultar-citas` (sin ruedita infinita). | |
| E2 | Reenviar código | En `/consultar-citas` → "¿No tienes tu código?" → DNI. Repite 4 veces en una hora. | Siempre el mismo mensaje ("Si el DNI tiene citas registradas, te enviamos los códigos a tu correo"); nunca se muestra el correo. A partir del 4.º pedido en la hora no llega correo. | |

## HU12 — Agenda y atención de citas

| # | Criterio / caso límite | Paso exacto | Resultado esperado | Resultado |
|---|---|---|---|---|
| C1 | Agenda filtrada por fecha, profesional y estado | Como admin de sede: `/admin/citas`. Cambia la fecha, el profesional y el estado (incluye "En sala"). Vacía la fecha. | La lista cambia con cada filtro; abre en la fecha de hoy (hora de Lima); con la fecha vacía muestra todas. Solo salen citas de su sede. La búsqueda encuentra por paciente, DNI, código o profesional. | |
| C1b | Filtro de sede | Como admin global en `/admin/citas` y `/admin/agenda`. | Además aparece el filtro de sede. El admin de sede no lo ve. | |
| C2 | La especialista ve solo sus citas | Inicia sesión como Dra. Ana (con otra profesional con citas en la misma sede). Revisa Dashboard, Mi agenda, Mis citas y Mis pacientes. | Solo sus citas y solo los pacientes de sus citas. "Pacientes atendidos" cuenta las citas atendidas. | |
| C3 | La técnica marca la llegada | Como técnica: `/profesional` ("Citas de hoy"). Pulsa "Marcar llegada" en una cita pendiente o confirmada de hoy. | La cita pasa a "En sala" y la lista se actualiza. No ve Reprogramar ni Marcar como atendida. | |
| C3b | La especialista atiende | Como Dra. Ana, abre la cita En sala → "Marcar como atendida". | La cita pasa a Atendida. | |
| CL1 | No registrar una cita fuera del horario del profesional | Admin → Citas → Reprogramar una cita de Dra. Ana al lunes de prueba 15:00 (fuera de 09:00–13:00). Prueba también "Nueva cita" en ese horario. | Reprogramar: "Ese horario está fuera del horario libre del profesional." Nueva cita: solo ofrece horarios libres; si se fuerza, "Ese horario ya no está disponible. Elige otro." | |
| U1 | Citas del día en una sola pantalla | `/admin/citas` con la fecha de hoy. | Hora, código, paciente (nombre y DNI), profesional, servicio, estado y acciones en una sola pantalla, sin scroll horizontal de la página. | |
| A1 | Acciones según estado | Abre citas en cada estado. | Pendiente: Confirmar, Marcar llegada, Reprogramar, Cancelar. Confirmada: Marcar llegada, Reprogramar, Cancelar. En sala: Marcar como atendida, Cancelar. Atendida/Cancelada: ninguna. | |
| A2 | Errores de acciones | Con DevTools → Offline, pulsa Confirmar o Cancelar en una cita. | Se muestra el error y los botones se liberan. | |

---

## Pruebas por rol

| Rol | Paso exacto | Resultado esperado | Resultado |
|---|---|---|---|
| Sin sesión | Abre `/admin` y `/profesional`. | Te lleva a `/login`. | |
| Sin sesión | Recorre `/`, `/reservar`, `/consultar-citas`. | Todo funciona sin cuenta. | |
| Sin sesión | En la consola del navegador intenta escribir en una tabla con la clave pública (por ejemplo `supabase.from('appointments').insert(...)`). | Rechazado: el público solo escribe a través de las Edge Functions. | |
| Especialista | Inicia sesión. | Entra a `/profesional` con Dashboard, Mi agenda, Mis citas y Mis pacientes, solo con sus citas. | |
| Especialista | Escribe `/admin/citas` en la barra. | Vuelve a `/profesional`. | |
| Técnica | Inicia sesión. | Entra a "Citas de hoy" de su sede con "Marcar llegada". | |
| Técnica | Escribe `/profesional/agenda`, `/profesional/citas` y `/admin`. | Vuelve a `/profesional`. | |
| Admin de sede | Inicia sesión → Sedes. | Solo ve sus sedes; sin "Nueva sede", "Editar" ni "Activar/Desactivar"; sí puede editar el horario y los feriados de su sede. | |
| Admin de sede | Especialidades y Servicios. | Solo lectura (sin crear, editar ni desactivar). | |
| Admin de sede | Equipo. | Sin "Activar/Desactivar". | |
| Admin de sede | Citas y Agenda. | Solo citas de su sede, sin filtro de sede. | |
| Admin de sede | Escribe `/profesional`. | Vuelve a `/admin`. | |
| Admin global | Recorre todas las secciones de `/admin`. | Ve y puede hacer todo, con filtro de sede en Citas y Agenda. | |
| Admin global | Equipo → desactiva una cuenta e intenta entrar con ella. | La cuenta no tiene permisos (no entra a su panel). | |
| Cualquiera | Con DevTools → Offline, recarga `/admin` o `/profesional`. | Termina de cargar y el login muestra "No se pudo comprobar tu sesión. Revisa tu conexión e inténtalo de nuevo." | |
| Cualquiera | Con DevTools → Offline, abre cualquier listado. | Un mensaje de error, nunca una ruedita infinita. | |

---

## Notas del recorrido por el código

- **HU10 NF (menos de 3 s):** no se puede comprobar en el código. La función consulta servicio, paciente y horarios libres en paralelo; hay que medirlo.
- **HU12 C1 en `/admin/agenda`:** la grilla semanal hace de filtro de fecha (no hay campo de fecha); el filtro de fecha está en `/admin/citas`.
- **Fuera del alcance de las HU, sin funcionalidad:** el botón "Nuevo paciente" de `/admin/pacientes` y el buscador y la campana de la cabecera del admin no hacen nada todavía.
- **Inicio (`/`):** el pie de página y la portada usan sedes y profesionales solo de adorno; si fallan no muestran mensaje (sí lo muestran las secciones "Dónde estamos" y "Quién te va a atender").
- El resto de criterios y casos límite de HU09–HU12 se ven implementados en el código (servicios, Edge Functions, `get_available_slots`, `reschedule_appointment`, `guard_appointment_changes` y las restricciones `appointments_no_overlap` / `appointments_no_patient_overlap`).
