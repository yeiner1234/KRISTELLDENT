# HU12 — Agenda y atención de citas (spec aprobada)

**Historia:** Como Administrador de sede yo debería poder ver la agenda de citas de mi sede, registrar citas y actualizar su estado a fin de organizar la atención diaria.

## Criterios de aceptación
1. La agenda se filtra por fecha, profesional y estado.
2. El especialista ve solo sus citas.
3. La técnica puede marcar la llegada del paciente: en la ventana de citas de hoy, al marcar la llegada, la cita pasa a "En sala".

## Caso límite
1. Impedir que se registre una cita fuera del horario del profesional.

**Usabilidad:** las citas del día se muestran en una sola pantalla.

## Contexto
Ya existen el estado 'in_room' ("En sala"), el trigger guard_appointment_changes (transiciones válidas: pending→confirmed|in_room|cancelled, confirmed→in_room|cancelled, in_room→completed|cancelled) y RLS por rol (la especialista solo ve sus citas; admin_sede y tecnica, las de su sede). Crear citas desde el admin pasa por create-public-appointment, que ya valida el horario. Reprogramar desde el admin hoy hace un UPDATE directo sin validar el horario: eso se cambia.

## Tareas
1. Migración nueva: función public.reschedule_appointment(p_appointment_id uuid, p_date date, p_start_time time) returns void, plpgsql, SECURITY INVOKER (así aplica la RLS de quien llama), set search_path = ''. Lee la cita; toma la duración del servicio (30 min si service_id es null); si p_start_time no está en public.get_available_slots(professional_id, branch_id, service_id, p_date, p_appointment_id), lanza excepción 'Ese horario está fuera del horario libre del profesional.'; si sí está, actualiza fecha, start_time y end_time. Grant execute a authenticated. rescheduleAppointment() de appointmentService.ts pasa a usar supabase.rpc('reschedule_appointment', ...) (caso límite 1).
2. Agenda del admin (src/pages/admin/AppointmentsPage.tsx y AgendaPage.tsx):
   - Filtros: fecha (por defecto hoy en hora de Lima), profesional, estado (incluye En sala) y, solo para admin_global, sede (criterio 1).
   - Vista "Citas del día" en una sola pantalla: hora, código, paciente (nombre y DNI), profesional, servicio, estado y acciones.
   - La búsqueda de texto encuentra por paciente, DNI, código o profesional.
   - Usa getAllProfessionalsForAdmin para los nombres, así las citas de profesionales inactivos no salen con "—".
   - Acciones según el estado: Confirmar, Marcar llegada (→ in_room), Marcar como atendida (in_room → completed), Reprogramar, Cancelar. Muestra solo las que el trigger permite.
3. Panel /profesional según el rol (src/pages/professional/* y ProfessionalSidebar):
   - especialista y odontologa_general: dashboard, agenda y citas filtradas por professional_id = user.id (además de la RLS) y pacientes solo de sus citas (criterio 2). Botón "Marcar como atendida" en sus citas En sala. "Pacientes atendidos" cuenta las completed.
   - tecnica: página principal "Citas de hoy" de su sede, ordenadas por hora, con botón "Marcar llegada" en las pending o confirmed, que las pasa a in_room y actualiza la lista (criterio 3). No ve acciones de reprogramar ni de atender.
4. Menú y acciones del admin según el rol (S8). Con admin_sede: en Sedes oculta Nueva sede, Editar y Activar/Desactivar (deja ver la sede y editar su horario y feriados); en Especialidades y Servicios, solo lectura; en Equipo, oculta Activar/Desactivar (solo admin_global puede). admin_global ve todo como hoy.
5. Todas las acciones de estado capturan errores y muestran el mensaje (por ejemplo, el del trigger), sin dejar botones colgados.
6. Errores encontrados en las pruebas del Sprint 3 que entran aquí:
   - admin_sede ve en Sedes las sedes que no administra: muéstrale solo las suyas.
   - Scroll horizontal en Especialidades, Servicios, Citas y "Mi agenda"; en Citas el botón "Nueva cita" queda fuera de la pantalla. Las tablas deben caber o hacer scroll solo dentro de su contenedor, con los botones siempre visibles.
   - Un usuario de /profesional que entra a /admin/... es enviado a /login: debe ir a /profesional (y un admin que entra a /profesional, a /admin).
   - En el detalle de la cita de "Mi agenda", "Profesional" sale "—".
   - "Mi agenda" abre en la semana anterior cuando hoy es domingo: debe abrir en la semana que contiene hoy (hora de Lima).

## Verificación pedida
- Como admin_sede: filtrar por fecha, profesional y estado cambia la lista; no ve citas de otras sedes (criterio 1).
- Como especialista: solo sus citas y pacientes, aunque la sede tenga otras doctoras (criterio 2).
- Como técnica: en Citas de hoy, Marcar llegada pasa la cita a En sala (criterio 3); luego la especialista la marca como atendida.
- Reprogramar desde el admin a una hora fuera del horario de la doctora da el error del caso límite 1.
- npm run build y npm run lint sin errores. Indicar qué migración aplicar.

## Decisiones de implementación (tomadas al planificar)
- Rama sprint3/hu12-agenda-atencion creada desde sprint3/hu11-reprogramacion-cancelacion (HU11 aún no está en main y toca los mismos archivos). Aprobado por el usuario.
- Acciones por rol: admin_global/admin_sede → todas las que permite el trigger; especialista/odontologa_general → Confirmar, Marcar como atendida, Cancelar; tecnica → solo Marcar llegada.
- Semana de "Mi agenda": la grilla muestra lunes a sábado. Se toma la semana que empieza en domingo y contiene hoy (Lima), mostrada de lunes a sábado: de lunes a sábado abre en la semana en curso; en domingo, en la que empieza mañana. Las fechas de la grilla se calculan como cadenas AAAA-MM-DD, sin depender de la zona del navegador.
- Filtro de fecha vacío = todas las fechas.
- tecnica no puede leer profiles de otros usuarios: los nombres de profesionales en su pantalla salen de get_public_professionals (getProfessionals).
- Las rutas /profesional/agenda, /pacientes y /citas son solo para roles profesionales; la tecnica que entra ahí vuelve a /profesional.
- El scroll horizontal viene de que la columna de contenido del layout (flex-1) no tiene min-w-0: se agrega en AdminLayout y ProfessionalLayout.
