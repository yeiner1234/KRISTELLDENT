# HU13–HU16 — Correos de citas, recordatorios, consulta segura e indicadores (spec aprobada)

Fuente: `10 Historias de Usuario HU13-HU16 SGCO-2026.pdf`. Decisiones del usuario (2026-11-25):
- HU15: se mantiene el flujo actual (DNI + código enviado al correo del paciente); solo se agrega el bloqueo por intentos.
- HU16: "no asistida" se calcula; no hay estado nuevo.
- HU13: el correo sale también cuando el personal reprograma o cancela desde el panel.
- Rama `sprint3/hu13-hu16`, creada desde `feat/pacientes-tecnica`.

## HU13 — Confirmación de citas por correo
Como Paciente yo debería poder recibir por correo la confirmación de mi cita con su fecha, hora, sede y código.
1. El correo se envía al reservar, reprogramar o cancelar una cita.
2. Incluye fecha, hora, sede, profesional y código.
3. Se envía con el servicio de correo configurado (Resend, `_shared/email.ts`).
- Caso límite 1: la cita se registra aunque falle el correo y se muestra su código en pantalla. (Ya existe: `emailSent`.)
- Caso límite 2: se rechaza la reserva si el correo no tiene formato válido. (Ya existe: `EMAIL_PATTERN` en booking.ts.)

**Estado:** reservar ya envía el correo. Falta reprogramar y cancelar, vengan del paciente o del personal.

## HU14 — Recordatorio de citas
Como Paciente yo debería poder recibir un recordatorio por correo un día antes de mi cita.
1. Se envía 24 horas antes de la cita (cita 20/11 10:00 → recordatorio 19/11 10:00).
2. Solo citas reservadas o reprogramadas (pending o confirmed).
3. Indica cómo reprogramar o cancelar con su código.
- Caso límite 1: no a citas canceladas.
- Caso límite 2: no si la cita se reservó (o reprogramó) con menos de 24 h de anticipación.
- No funcional: envío automático todos los días.

## HU15 — Consulta de citas con código de verificación
Se mantiene la consulta con DNI + código enviado al correo registrado (ya existe con "reenviar códigos"). Se agrega:
- Caso límite 1: bloquear la consulta 5 minutos tras 3 códigos incorrectos (por DNI).
- Caso límite 2: el mismo mensaje si el DNI no está registrado (ya existe: `MISMATCH_ERROR`; el bloqueo también aplica a DNIs no registrados, así no revela nada).
- Desviación aceptada: el código es el de la cita (KD-XXXXXX), no uno de 6 dígitos que vence a los 10 minutos.

## HU16 — Panel de indicadores de la sede
Como Administrador de sede yo debería poder ver indicadores básicos de las citas de mi sede.
1. Citas del periodo: reservadas, atendidas, no asistidas y canceladas.
2. Filtros por fecha y profesional.
3. El administrador global ve todas las sedes.
- Caso límite 1: el administrador de sede no ve indicadores de otras sedes.
- Usabilidad: en una sola pantalla.

Definiciones: **Reservadas** = todas las citas del periodo; **Atendidas** = completed; **Canceladas** = cancelled; **No asistidas** = pending/confirmed cuya hora de fin ya pasó (hora de Lima); **Por atender** = el resto (pending/confirmed futuras e in_room). Reservadas = atendidas + no asistidas + canceladas + por atender.
