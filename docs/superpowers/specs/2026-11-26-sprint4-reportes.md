# Sprint 4: reportes "Mis citas", "Mis pacientes" e "Historia de paciente"

Prompt del usuario del 2026-11-26, con el documento "Sustento de los reportes del sistema" (figuras 2, 3 y 4).
Mismo diseño y comportamiento que la agenda imprimible (hoja A4, filtros que no se imprimen, controles de
tamaño en celular, impresión del navegador con pie por página).

## Quién y dónde (menú "Imprimibles")
- Reporte de mis citas: especialista y odontóloga general → `/profesional/reportes/mis-citas`.
- Reporte de mis pacientes: especialista y odontóloga general → `/profesional/reportes/mis-pacientes`.
- Historia de paciente: especialista, odontóloga general y técnica (el sustento la pide la doctora y la usan las
  trabajadoras de recepción) → `/profesional/reportes/historia?paciente=<id>`.
- Admin de sede y admin global no los ven (el sustento deja los reportes de sede para cuando se coordine con la
  encargada).

## Datos
Migración `20261126100000_sprint4_reportes.sql`:
- patients: `history_number` (HC-00245, lo asigna la base), `birth_date`, `address`.
- services: `sessions` (más de una = tratamiento); se edita en Servicios.
- RPC `branch_attendance_summary` (promedio de la sede, sin datos de pacientes), `my_patients_first_visit`
  (nuevo / recurrente según la clínica), `patient_history` (la profesional ve toda la historia de sus pacientes;
  la técnica, las citas de sus sedes).

## Reglas
- Tasa de atención = atendidas ÷ (atendidas + canceladas). Sin cerrar = pasada y pendiente/confirmada/en sala.
- Periodo por defecto: los últimos tres meses hasta hoy; se compara con el periodo anterior (mismos meses atrás si
  empieza el día 1; si no, los mismos días justo antes).
- Nuevo: primera atención en la clínica dentro del periodo. Frecuente: 3+ atendidas con ella en 12 meses.
- Tratamiento: solo dos estados. "Cancelado" si no tiene próxima sesión y su última cita se canceló o pasaron más de
  60 días desde la última sesión; si no, "En tratamiento". Un ciclo con todas sus sesiones atendidas no se lista.

## Reportes de administración (catálogo CAT-REP-2026-01)
Prompt del 2026-11-26. Solo admin_global (nivel global) y admin_sede (nivel sede); se omiten las variantes de
especialista y técnica del catálogo (ya implementadas arriba) y la sección de pacientes inactivos.
- `/admin/reportes/citas`, `/pacientes`, `/desempeno`, `/ingresos`, en "Imprimibles" del panel admin.
- Global con "Todas": comparativo por sede (+ por especialidad / por doctora). Global con una sede o admin de sede:
  tablas por doctora; la admin de sede ve "promedio clínica" (RPC `clinic_benchmarks`, solo agregados).
- Nuevo/recurrente con la primera atención en la clínica (RPC `patients_first_visit`).
- Ingresos con el precio guardado en la cita (`service_price`); "Precio vigente" = precio actual del servicio.
- DNI enmascarado en el papel. Migración `20261126200000_sprint4_reportes_admin.sql`.
