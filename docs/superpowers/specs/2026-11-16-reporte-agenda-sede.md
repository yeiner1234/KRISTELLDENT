# Reporte "Agenda de citas de la sede" (nivel operativo)

Prompt aprobado por el usuario el 2026-11-16. Plantilla validada: `docs/reportes/figura1-agenda-citas-sede.png`
(el prompt citaba `figura1-agenda-citas-sede.jpg`, que no estaba en el repo; se guardó la imagen que pegó el usuario).

## Quién y dónde
- tecnica: `/profesional/reportes/agenda`. admin_sede y admin_global: `/admin/reportes/agenda`.
- Opción "Agenda imprimible" en el menú de cada uno. Especialista y odontóloga general no lo ven.
- tecnica y admin_sede eligen entre sus sedes (user_branch_access); admin_global, entre todas.

## Filtros (barra que no se imprime)
Fecha (hoy en Lima), sede, doctora (Todas o una), estado (por defecto "Pendiente y confirmada"; Todas, Pendiente,
Confirmada, En sala, Atendida, Cancelada), turno (Mañana < 13:00, Tarde ≥ 13:00, por defecto "Mañana y tarde").
Botón "Imprimir / Descargar PDF".

## Hoja A4 vertical
1. Encabezado con logo, "Clínica odontológica", "Sede <nombre> · <dirección>"; a la derecha DOCUMENTO
   `AGE-<SED>-<año>-<MMDD>`, GENERADO dd/mm/aaaa · HH:MM (Lima), EMITIDO POR, ROL, ALCANCE DE LOS DATOS.
   Línea gris con tramo verde azulado y magenta.
2. "MÓDULO DE REPORTES • NIVEL OPERATIVO".
3. Título, fecha de la agenda ("Jueves 15 oct 2026"), "Sede <nombre> · <apertura> – <cierre>" o "Sede cerrada";
   subtítulo.
4. Caja de filtros aplicados: SEDE, DOCTORA ("Todas (N)"), ESTADO, TURNO.
5. Tarjetas: CITAS DEL DÍA, CONFIRMADAS, POR CONFIRMAR, DOCTORAS EN TURNO (con primeros apellidos).
6. "01 Agenda del día" / "Orden cronológico"; tabla HORA, PACIENTE, SERVICIO, DOCTORA, ESTADO, ASISTIÓ, NOTAS,
   orden por hora y doctora. Nota al pie de la tabla. Sin citas: "No hay citas programadas para este día."
7. NOTAS en dos columnas.
8. Pie: "KristellDent · Agenda de citas de la sede · Nivel operativo" | "Confidencial — uso interno" | "Página X de Y".

Colores: #008F9F, #C4165D, #17242C, #6B7880, #F2F5F7, #E07B39. PDF con la impresión del navegador.

## Datos
Sin migraciones. appointmentService + RLS actual; nombres con get_public_professionals.
Lógica pura en `src/utils/reports/agenda.ts`, con pruebas primero.
