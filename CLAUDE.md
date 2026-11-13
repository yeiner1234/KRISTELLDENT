# KRISTELLDENT — contexto para el agente

Sistema de gestión de citas odontológicas de la clínica Kristell Dent (proyecto SGCO-2026, 4 sedes).

## Stack
- Frontend: React 19 + TypeScript + Vite + Tailwind 4 + React Router 7. Iconos lucide-react.
- Backend: Supabase (Postgres con RLS, Auth, Edge Functions en Deno).
- Comandos: `npm run dev`, `npm test` (Vitest), `npm run build` (tsc + vite), `npm run lint` (oxlint).

## Estructura
- src/pages/{public,admin,professional,auth}, src/components/{common,booking,appointments,dashboard,home}
- src/services: único lugar que habla con Supabase. src/hooks: estado de carga. src/types: tipos de dominio.
- supabase/migrations: SQL versionado. supabase/functions: Edge Functions. supabase/scripts: SQL manual (datos de prueba, limpieza), nunca en migrations.
- Pruebas: archivos *.test.ts / *.test.tsx junto al código que prueban.

## Dominio
- Roles (enum app_role): admin_global, admin_sede, especialista, odontologa_general, tecnica. especialista y odontologa_general son roles profesionales (PROFESSIONAL_ROLES en src/services/professionalService.ts): tienen ficha en professionals, entran a /profesional y ven solo sus citas; el especialista tiene una sola especialidad (trigger enforce_specialist_single_specialty) y la odontóloga general ofrece servicios de cualquier especialidad. Nunca compares solo con 'especialista': usa PROFESSIONAL_ROLES. El paciente NO tiene cuenta: se identifica con DNI de 8 dígitos.
- /admin/* → admin_global y admin_sede. /profesional/* → especialista, odontologa_general y tecnica. Público: /, /reservar/*, /consultar-citas, /mis-citas.
- Tablas: profiles, branches, user_branch_access, specialties, services, professionals, professional_branches, professional_specialties, professional_services, branch_schedules, professional_schedules, schedule_exceptions, patients, appointments.
- Disponibilidad: RPC get_available_slots. Los choques de horario los impide la restricción appointments_no_overlap.
- El paciente solo escribe a través de Edge Functions con service_role (secreto SB_SECRET_KEY). Nunca dar permisos de escritura a anon.
- Zona horaria del negocio: America/Lima. Supabase corre en UTC, así que toda "fecha u hora de hoy" se calcula en hora de Lima, en SQL y en el frontend.

## Flujo Superpowers
El plugin Superpowers está instalado. Estas reglas del usuario tienen prioridad sobre las de sus habilidades:
- Cada prompt del Sprint 3 es un diseño ya aprobado. No repitas el brainstorming: pregunta solo si el prompt contradice el código o es ambiguo. Guarda el prompt como spec en docs/superpowers/specs/ y arma el plan con writing-plans en docs/superpowers/plans/.
- Ejecución: executing-plans en esta misma sesión, salvo que el usuario pida subagentes.
- Worktrees: no. Trabaja en esta carpeta (aquí están .env.local y node_modules), en una rama nueva sprint3/<prompt> creada desde main.
- TDD obligatorio para la lógica de src/utils, src/services y src/hooks, y para los cálculos de las Edge Functions extraídos a funciones puras. En pantallas clave (reserva, mis citas, agenda, marcar llegada), al menos una prueba con React Testing Library del flujo principal. Supabase se mockea con vi.mock.
- SQL y RLS no tienen pruebas automáticas: en el plan escribe, por cada regla, la consulta o el paso manual que la comprueba.
- systematic-debugging ante cualquier error; nada de parches a ciegas.
- verification-before-completion: no digas "listo" sin haber corrido en esta sesión npm test, npm run build y npm run lint, y mostrar su resultado.
- requesting-code-review al terminar cada prompt, contra los criterios de aceptación y casos límite de la HU.
- finishing-a-development-branch: elige mantener la rama. Sin merge, push ni PR: eso lo hace el usuario.

## Reglas de trabajo
- Nunca edites una migración existente: crea una nueva con el formato AAAAMMDDHHMMSS_nombre.sql.
- No ejecutes nada contra el Supabase de producción. Al terminar, lista para el usuario qué migraciones y Edge Functions debe aplicar y con qué comando. El usuario aplica las migraciones pegándolas en el SQL Editor de Supabase, una por archivo y en orden (no usa db push: el historial remoto solo registra las 8 migraciones de septiembre). Toda migración nueva debe poder correrse dos veces sin error (if not exists, create or replace, drop ... if exists antes de create trigger o policy).
- Textos de la interfaz en español. Reutiliza los componentes de src/components/common y el estilo existente.
- Los errores de Supabase se muestran al usuario con un mensaje claro; nunca una ruedita de carga infinita.
- Antes de cada commit: npm test, npm run build y npm run lint sin errores.
- Commits pequeños en español con prefijo (feat, fix, test, refactor, docs).
