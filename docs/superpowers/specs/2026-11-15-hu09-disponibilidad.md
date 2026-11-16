# HU09 — Consulta de disponibilidad (spec)

Diseño aprobado por el usuario (prompt del Sprint 3). Rama: `sprint3/hu09-disponibilidad`.

**Historia:** Como Paciente yo debería poder consultar los horarios disponibles por sede, servicio y profesional a fin de elegir la fecha y hora de mi cita.

**Criterios:**
1. La disponibilidad se filtra por sede, servicio y profesional.
2. Solo se muestran horarios libres del profesional.
3. Los horarios respetan la duración del servicio: con un servicio de 45 min solo salen horarios con 45 min libres.

**Casos límite:**
1. Ocultar horarios bloqueados por una excepción del profesional.
2. Mostrar un mensaje cuando no haya horarios en la fecha elegida.

**Usabilidad:** los horarios se muestran en un calendario.

**Contexto:** `get_available_slots` ya calcula todo en la base de datos (horario de sede + horario del profesional + excepciones + citas tomadas + duración del servicio). No existe ninguna pantalla para cargar `professional_schedules` ni `schedule_exceptions`: sin esos datos no sale ningún horario.

## Tareas

1. **Horario semanal del profesional (admin).** Revisar y completar `src/services/professionalScheduleService.ts` (`getProfessionalScheduleForAdmin`, `setProfessionalSchedule`) y el modal "Horario" de `ProfessionalsPage.tsx`, sin rehacerlos. El modal: elegir una de las sedes asignadas al profesional y, por cada día (lunes a domingo, `day_of_week` 0 = domingo), uno o varios rangos inicio–fin. Validaciones: fin > inicio, rangos del mismo día sin cruzarse, aviso si un rango sale del horario de la sede (`branch_schedules`). Guardar reemplaza las filas de ese profesional en esa sede. Como `setProfessionalSchedule` borra y vuelve a insertar, validar todo antes de borrar.
2. **Excepciones (admin).** En el mismo modal, pestaña "Ausencias y turnos extra": lista de próximas excepciones del profesional y formulario con fecha, día completo o rango de horas, tipo (no disponible / turno extra = `is_available` true) y motivo. Permite borrar. En `BranchesPage.tsx`, "Feriados y cierres" por sede (`branch_id`, `professional_id` null, día completo, `is_available` false). Crear `src/services/scheduleExceptionService.ts`.
3. **Privacidad:** migración que hace drop de la policy `schedule_exceptions_select_public`. Antes, confirmar con grep que ningún código público lee esa tabla.
4. **Reserva filtrada por sede (C4).** En `ProfessionalStep.tsx`, `ServiceStep.tsx` y `DateTimeStep.tsx`, los candidatos cumplen `specialtyIds.includes(specialtyId)` Y `branchIds.includes(branchId)`, también con "cualquier profesional". `ProfessionalStep` y `ServiceStep` reciben `branchId` desde `BookingPage`.
5. **Recomendación por motivo (C3).** `attentionMotives.ts` usa IDs fijos que no existen (en la base son UUID). Cambiar `recommendedSpecialtyId` por una lista de nombres candidatos; "corregir la posición" debe ir a Odontología General si no hay Ortodoncia. `AttentionStep` busca comparando nombres normalizados (minúsculas, sin tildes, contiene). Sin coincidencia se mantiene el mensaje actual.
6. **Calendario y mensajes.** En `CalendarPicker` / `DateTimeStep`: deshabilitar días pasados en hora de Lima y días en que la sede está cerrada según su horario semanal. `DateTimeStep`: catch al `Promise.all`; si falla, "No se pudieron cargar los horarios. Intenta de nuevo." con botón Reintentar. Mantener "No hay horarios disponibles".

## Verificación manual (para el usuario)
- Doctora lunes 09:00–13:00, servicio 45 min: salen 09:00, 09:30 … 12:00 y no 12:30.
- Excepción 10:00–11:00 ese lunes: desaparecen los horarios que se cruzan.
- En la sede A no aparecen doctoras que solo atienden en la sede B.
- Cada motivo de "Cuéntanos qué necesitas" lleva a una especialidad existente.
- `npm run build` y `npm run lint` sin errores. Commits separados por tarea.
