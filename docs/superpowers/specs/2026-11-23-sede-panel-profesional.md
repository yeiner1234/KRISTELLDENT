# Sede en el panel profesional — spec aprobada

Diseño aprobado por el usuario. Rama: `sprint3/sede-panel-profesional`, creada desde `main`.

Una profesional o técnica con varias sedes ve sus citas mezcladas sin saber de qué sede es cada una. En el panel /profesional (Dashboard, Mi agenda, Mis citas, Mis pacientes y, para la técnica, Citas de hoy y Agenda imprimible):
1. Mostrar la sede de cada cita (etiqueta o columna "Sede").
2. Agregar arriba un selector "Sede" con "Todas mis sedes" y cada una de sus sedes, que filtre todas esas pantallas a la vez y se recuerde mientras dure la sesión. Por defecto: la sede donde tiene horario hoy (hora de Lima); si son varias o ninguna, "Todas mis sedes".
3. Si la persona tiene una sola sede, no mostrar el selector.

Pruebas con React Testing Library, `npm test`, build y lint.

## Decisiones tomadas al planificar
- **"Mis sedes".** Especialista y odontóloga general: `professional_branches` (donde atiende). Técnica: `user_branch_access` (Equipo). Solo sedes activas (los nombres salen de `getBranches`).
- **"Horario hoy".** Profesionales: sedes con una fila en `professional_schedules` para el día de la semana de hoy en Lima. Técnica: no tiene horario propio; se usan las sedes suyas que abren hoy según `branch_schedules`. Los turnos extra y las ausencias del día no cuentan (fuera de alcance).
- **"Mientras dure la sesión".** `sessionStorage` por usuario (`kd.panelBranch.<userId>`), en try/catch. Si la sede guardada ya no es suya, vuelve al valor por defecto.
- **Dónde vive.** Un proveedor en `ProfessionalLayout`; el selector va arriba del contenido de todas las pantallas del panel. Fuera del panel (la agenda imprimible en /admin) el hook devuelve "todas" y no hay selector.
- **Agenda imprimible.** Es de una sede por hoja. En el panel, su propio selector "Sede" es el del panel (elegir una sede ahí cambia la de todo el panel) y el selector general no se repite en esa pantalla. Con "Todas mis sedes" la hoja usa la primera sede. En /admin no cambia nada.
- **Mis pacientes.** No son citas: el selector filtra a los pacientes con citas en esa sede; no se agrega etiqueta.
- **Etiqueta de sede.** Se muestra siempre (también con una sola sede): es un dato de la cita. En Mi agenda va en el subtítulo de cada bloque y en el detalle de la cita.
