# HU11 — Reprogramación y cancelación de citas (spec aprobada)

**Historia:** Como Paciente yo debería poder reprogramar o cancelar mi cita con mi DNI y el código de la cita a fin de cambiar mi atención sin llamar a la clínica.

## Criterios de aceptación
1. El paciente ingresa su DNI y el código de su cita.
2. La reprogramación muestra solo horarios disponibles.
3. Las citas canceladas liberan su horario: si un paciente cancela, otro paciente que consulte esa fecha ve el horario disponible.

## Casos límite
1. Impedir que se reprograme o cancele una cita ya atendida.
2. Rechazar el código si no corresponde al DNI ingresado.

**Usabilidad:** las citas del paciente se muestran en una sola pantalla.

## Contexto
Hoy /consultar-citas pide solo el DNI, /consultar-citas/verificar acepta cualquier código de 6 dígitos (verifyCode siempre devuelve true) y la Edge Function lookup-appointments-by-dni devuelve nombre, correo, teléfono y citas de cualquier DNI. Eso se elimina. Ya existen appointment_code, el trigger guard_appointment_changes (no deja modificar citas completed/cancelled ni reprogramar si no están pending/confirmed) y get_available_slots con p_exclude_appointment_id.

## Tareas
1. Nueva Edge Function `supabase/functions/patient-appointments/index.ts` (service_role con SB_SECRET_KEY, mismo estilo y CORS que create-public-appointment). Recibe `{ action, dni, code, ... }`. Para TODA acción primero verifica que exista una cita con appointment_code = code cuyo paciente tenga ese dni; si no, 404 con "El DNI y el código no coinciden." (mismo mensaje para cualquier fallo). Normaliza el código (mayúsculas, sin espacios, con o sin "KD-").
   - `list`: citas del paciente con code, fecha, horas, estado, nombre de sede, nombre del profesional, nombre y duración del servicio. Del paciente solo el nombre.
   - `cancel` + appointmentId: la cita es de ese paciente, está en pending o confirmed y no es de una fecha pasada (Lima) → status 'cancelled'.
   - `reschedule` + appointmentId, date, startTime: misma verificación; confirma con get_available_slots(professional, branch, service, date, appointmentId) que startTime está libre; end_time con la duración del servicio; actualiza. 23P01 → "Ese horario ya no está disponible"; P0001 del trigger → su mensaje.
   - El frontend pide los horarios a get_available_slots directamente con p_exclude_appointment_id.
2. Borrar lookup-appointments-by-dni, getAppointmentsByPatientDni, VerifyAppointmentPage y su ruta, requestVerificationCode y verifyCode.
3. /consultar-citas: formulario con DNI y código. Al validar navega a /mis-citas con dni y code en el state (nunca en la URL).
4. /mis-citas (una sola pantalla): tarjeta por cita con código, fecha, hora, sede, profesional, servicio y estado. Reprogramar y Cancelar solo en pending/confirmed de hoy en adelante.
   - Cancelar: diálogo de confirmación y recarga.
   - Reprogramar: modal con calendario y horarios libres del mismo profesional, sede y servicio; al confirmar llama a 'reschedule'.
   - Sin state (recarga) → vuelve a /consultar-citas.
5. Errores siempre visibles, sin ruedita infinita.
6. Correo con el código de la cita (mejora, no está en las HU):
   - `supabase/functions/_shared/email.ts` con `sendEmail({ to, subject, html })` sobre la API HTTP de Resend con los secretos RESEND_API_KEY y EMAIL_FROM. Si falta un secreto, registra un aviso y no lanza error.
   - create-public-appointment: tras crear la cita envía al correo del paciente el código, fecha, hora, sede, profesional, servicio y el enlace a /consultar-citas. Si el envío falla, la reserva igual se confirma.
   - patient-appointments: acción 'resend-code' con dni. Si el paciente tiene citas futuras pending/confirmed, envía sus códigos SOLO a su correo registrado. Responde siempre "Si el DNI tiene citas registradas, te enviamos los códigos a tu correo", exista o no el DNI; nunca muestra el correo. Máximo 3 envíos por DNI por hora.
   - /consultar-citas: enlace "¿No tienes tu código? Te lo enviamos a tu correo" que pide el DNI y llama a 'resend-code'.
   - BookingSuccessPage: "También te enviamos el código a tu correo" solo si la función confirma que el envío salió bien.

## Decisiones
- El enlace del correo sale del secreto SITE_URL (no del header Origin, que cualquiera puede falsificar en un POST directo y convertiría el correo de la clínica en phishing). Sin SITE_URL el correo indica la ruta en texto.
- El límite de 3 por hora cuenta pedidos por DNI (exista o no), en la tabla nueva `patient_code_email_log` (RLS sin policies, solo service_role).
- create-public-appointment usa el correo registrado del paciente (que una reserva no sobrescribe), no el del formulario.
