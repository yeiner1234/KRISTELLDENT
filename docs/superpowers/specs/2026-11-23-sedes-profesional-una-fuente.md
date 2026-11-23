# Sedes de una profesional: una sola fuente — spec aprobada

Diseño aprobado por el usuario en la rama `sprint2/pendientes`, a raíz de la prueba del cruce de horarios: el admin de Jaén no podía guardar el horario de ANali porque ella tenía Jaén en Profesionales (`professional_branches`) pero no en Equipo (`user_branch_access`).

## Decisión
Profesionales es la única fuente de las sedes de una profesional. Un trigger lo copia a `user_branch_access`.

## Condiciones
1. El trigger es SECURITY DEFINER, sincroniza al agregar y al quitar una sede y solo actúa para perfiles con rol profesional (`PROFESSIONAL_ROLES`: especialista, odontologa_general). Técnicas y administradoras siguen gestionándose en Equipo.
2. Datos existentes: copiar `professional_branches` a `user_branch_access`. Los casos al revés (acceso en Equipo a una sede donde no atiende en Profesionales) no se borran ni se agregan: se deja una consulta que los lista y el usuario decide cada uno.
3. Una persona = una cuenta. Si se intenta crear en Equipo una cuenta con un correo que ya existe: "Ese correo ya tiene una cuenta. Para que atienda en otra sede, agrégala en Profesionales." En Equipo, para profesionales, sus sedes se muestran con la nota "Se asignan en Profesionales".

Pruebas, `npm test`, build y lint. Decir qué migración pegar y si hay que desplegar alguna función.

## Decisiones tomadas al planificar
- La invitación de una profesional conserva "Sedes asignadas" como sede inicial: un admin_sede la necesita para poder crearle la ficha (las políticas de `professionals`/`professional_branches` piden `shares_branch_with`, que mira `user_branch_access`). El modal lo aclara para los roles profesionales.
- El trigger también cubre UPDATE de `professional_branches` (quita la sede vieja y agrega la nueva), aunque hoy el panel solo inserta y borra.
- Seguridad: el trigger escribe en `user_branch_access`, que antes solo escribía admin_global. Queda acotado por la política de inserción de `professional_branches`: un admin_sede solo agrega a sus sedes a una profesional con la que ya comparte sede.
- Correo repetido, en tres capas: la pantalla compara con los correos que ya ve en Equipo; la Edge Function `create-internal-user` busca el correo en `profiles` antes de invitar y traduce el error de Auth "already been registered"; `teamService` traduce ese mismo error de Auth por si la función todavía no se redesplegó.
- En Equipo, las sedes de una profesional se leen de `professional_branches` (la fuente), no de `user_branch_access`.

## Comprobación manual del SQL
| Regla | Paso |
|---|---|
| Alta sincroniza | Agregar Jaén a ANali en Profesionales → `select * from user_branch_access where user_id = '<ANali>'` incluye Jaén. |
| Baja sincroniza | Quitar Jaén en Profesionales → la fila de Jaén desaparece de `user_branch_access`. |
| Solo roles profesionales | `insert into professional_branches` para un perfil tecnica (si existiera) no toca `user_branch_access`. |
| Copia inicial | Después de la migración, la consulta de "casos al revés" solo lista accesos de Equipo sin sede en Profesionales. |
| Re-ejecutable | Correr la migración dos veces: sin error, sin filas duplicadas (unique user_id, branch_id). |
