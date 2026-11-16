# Plan: reporte "Agenda de citas de la sede"

Spec: `docs/superpowers/specs/2026-11-16-reporte-agenda-sede.md`. Rama `reportes/agenda-sede` desde main.

1. **TDD `src/utils/reports/agenda.ts`**: `buildDocumentCode`, `formatAgendaDate`, `formatGeneratedAt`,
   `doctorInitials`, `formatDoctorName`, `firstSurname`, `formatPatientName`, `matchesShift`, `matchesStatus`,
   `buildAgendaRows` (filtra por sede, fecha, doctora, estado y turno; ordena por hora y doctora),
   `summarizeAgenda` (total, confirmadas, pendientes, doctoras en turno), `roleLabel`, `branchHoursLabel`.
   Commit `feat:`.
2. **Página `src/pages/reports/AgendaReportPage.tsx`** + `src/styles/report-print.css`:
   barra de filtros (`print:hidden`), hoja A4, tabla con `<thead>` (se repite al imprimir), pie fijo con contador
   CSS de páginas. Prueba RTL del flujo principal (render de filas, filtro de estado, mensaje sin citas).
3. **Rutas y menús**: `/admin/reportes/agenda` (admin_global, admin_sede), `/profesional/reportes/agenda` solo
   tecnica (RoleRoute). "Agenda imprimible" en AdminSidebar y en el menú de la técnica.
4. **Verificación**: npm test, build, lint; vista previa de impresión de Chrome contra la figura.

## Comprobaciones manuales (RLS, sin cambios de SQL)
- Entrar como técnica de Bagua: el selector de sede solo muestra Bagua (user_branch_access_select_own) y la tabla
  solo trae citas de Bagua (appointments_select_branch_staff).
- Entrar como especialista: "Agenda imprimible" no aparece y `/profesional/reportes/agenda` redirige.
