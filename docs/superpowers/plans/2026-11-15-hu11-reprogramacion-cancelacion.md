# Plan HU11 — Reprogramación y cancelación de citas

Spec: `docs/superpowers/specs/2026-11-15-hu11-reprogramacion-cancelacion.md`. Rama `sprint3/hu11-reprogramacion-cancelacion` (desde main). Sin migraciones: `get_available_slots` ya ignora las citas `cancelled` (criterio 3) y `guard_appointment_changes` ya bloquea completed/cancelled.

## Tarea 1 — Lógica pura de la Edge Function (TDD)
`supabase/functions/patient-appointments/patientAppointments.ts` + `.test.ts` (sin imports de Deno). Reutiliza `limaToday`, `addMinutes` y `overlapErrorMessage` de `../create-public-appointment/booking.ts`.
- `normalizeAppointmentCode(raw)` → `KD-XXXXXX` o null. Pruebas: minúsculas, espacios, sin prefijo, con "KD" sin guion, letras fuera del alfabeto (O, 0, I, 1) → null, largo distinto → null.
- `parseRequest(payload)` → `{ ok, value }` o `{ ok: false, status, error }`. DNI o código mal formados → 404 con el mensaje único (no se revela nada). Acción desconocida → 400. cancel/reschedule sin appointmentId UUID → 400. reschedule con fecha imposible u hora inválida → 400.
- `modificationError(appointment, todayLima)` → mensaje o null: completed/in_room/cancelled → rechazo; fecha < hoy (Lima) → rechazo; pending/confirmed de hoy o futuro → null.
- `triggerErrorMessage(error)` → mensaje del P0001 o null.
Commits `test:` + `feat:`.

## Tarea 2 — index.ts
Verificación DNI+código: cita por `appointment_code` → paciente por `id` y `dni`. Si algo falla → 404 "El DNI y el código no coinciden.". `list`: citas del paciente + sedes, perfiles (nombre del profesional) y servicios en paralelo con `.in()`. `cancel`/`reschedule`: cita por `id` y `patient_id` (si no es suya → 404 mismo mensaje), `modificationError`, luego update. Reschedule: duración del servicio (30 si no hay, como la RPC), `get_available_slots` con `p_exclude_appointment_id`.
Comprobación manual (Deno + BD, sin pruebas automáticas):
- POST `{action:'list', dni:<DNI real>, code:<código de otra persona>}` → 404 "El DNI y el código no coinciden."
- POST `cancel` sobre una cita completed → 409 con mensaje; `select status from appointments where id=…` sigue completed.
- POST `reschedule` a una hora ocupada → 409 "Ese horario ya no está disponible. Elige otro."
- Tras cancelar: `select * from get_available_slots(prof, sede, servicio, fecha)` incluye la hora liberada.
Commit `feat:`.

## Tarea 3 — Servicio del frontend (TDD)
En `appointmentService.ts`: `getPatientAppointments(dni, code)`, `cancelPatientAppointment(dni, code, id)`, `reschedulePatientAppointment(dni, code, id, date, startTime)` → invocan `patient-appointments` y propagan el mensaje del servidor. Borrar `getAppointmentsByPatientDni` (+ su prueba) y `fetchByDni` de `useAppointments`. Tipo `PatientAppointment` en `src/types/Appointment.ts`.

## Tarea 4 — Utilidad y hook (TDD)
- `src/utils/patientAppointments.ts`: `canPatientModify(appointment, today)`.
- `src/hooks/usePatientAppointments.ts`: `{ patientName, appointments, isLoading, error, refetch }`; error de red → mensaje visible e `isLoading` false.

## Tarea 5 — Pantallas (RTL)
- `ConsultAppointmentsPage`: DNI + código; valida formato; llama a `getPatientAppointments`; si falla muestra el mensaje; si va bien navega a /mis-citas con `{ dni, code }` en el state.
- `MyAppointmentsPage`: sin state → `<Navigate to="/consultar-citas">`. Tarjetas `PatientAppointmentCard`; botones según `canPatientModify`; diálogo de cancelar; `PatientRescheduleModal` con `AdminSlotPicker` (nuevo prop `excludeAppointmentId` y error visible con Reintentar).
- Pruebas: consultar → navega con state; error del servidor visible; mis-citas muestra botones solo en pending futura, no en completed; cancelar confirma y recarga; sin state redirige.
- Borrar `VerifyAppointmentPage`, su ruta, `VerificationCode`, `isValidVerificationCode`, `requestVerificationCode`, `verifyCode` y `supabase/functions/lookup-appointments-by-dni`.

## Verificación
`npm test`, `npm run build`, `npm run lint`. Lista manual de la HU para el usuario.

## Tarea 6 — Correo con el código
- TDD `supabase/functions/_shared/email.test.ts`: `sendEmail` sin secretos → false sin llamar a fetch; con secretos → POST a `https://api.resend.com/emails` con Bearer y `{from,to,subject,html}`, true si 2xx; error HTTP o de red → false (no lanza). `Deno.env` y `fetch` con `vi.stubGlobal`.
- TDD `_shared/emailTemplates.test.ts`: `bookingEmail(...)` y `appointmentCodesEmail(...)` incluyen código, fecha, hora, sede, profesional, servicio; escapan HTML; con siteUrl ponen `<siteUrl>/consultar-citas`, sin él la ruta en texto.
- TDD `parseRequest` acepta `resend-code` solo con DNI (código no requerido).
- Migración `20261115300000_hu11_limite_reenvio_codigo.sql`: tabla `patient_code_email_log (id, dni, requested_at)`, índice `(dni, requested_at)`, RLS activo sin policies, grants solo a service_role. Comprobación manual: `set role anon; select * from patient_code_email_log;` → permission denied; correr la migración dos veces sin error.
- index.ts `resend-code`: cuenta pedidos de la última hora; si < 3 registra y, si el paciente existe con citas futuras pending/confirmed y correo, envía. Siempre 200 con el mensaje fijo.
- create-public-appointment: lee nombre de sede, profesional y servicio; envía con el correo registrado; responde `emailSent`.
- Frontend: `requestAppointmentCodes(dni)`; enlace en /consultar-citas; ConfirmBookingPage pasa `emailSent`; BookingSuccessPage muestra el aviso solo si `emailSent`. Pruebas RTL.

## Arreglos de la revisión de código
- "Ya pasó" se decide con fecha **y hora** de Lima (`canPatientModify`, `modificationError`, `getLimaNowTime`, `limaNow`): una cita de hoy cuya hora ya empezó no muestra botones y el servidor la rechaza.
- Cancel/reschedule repiten `status in (pending, confirmed)` en el UPDATE; si la cita cambió de estado entre lectura y escritura → 409 "La cita cambió de estado…".
- Una reserva pública nunca registra el correo de un paciente existente (`missingPatientFields`), y el correo de la reserva va solo al correo registrado.
- Migración `20261115400000_hu11_codigo_limitado.sql`: columna `appointments.code_limited`. create-public-appointment la marca si el DNI existía y nombres/correo no coinciden (`bookingMatchesPatient`); ese código solo abre su propia cita y `list` no devuelve el nombre registrado (`canAccessAppointment`). Comprobación manual: reservar con un DNI existente y otro correo → con ese código `/mis-citas` muestra solo esa cita; un POST `cancel` sobre otra cita del paciente con ese código → 404 "El DNI y el código no coinciden.". Correr la migración dos veces sin error.
- resend-code: registra el pedido y luego cuenta (sin carrera; el 4.º en una hora no envía), limpia registros de más de un día y responde sin esperar el envío (`EdgeRuntime.waitUntil`) para no revelar por tiempo si el DNI tiene citas.
