# Plan: responsive para celular

Rama feat/responsive-movil, creada desde fix/auditoria-oferta (main va 49 commits detrás). El trabajo sin
commit de la técnica (páginas Branch*, TeamPage, ProfessionalSidebar, AppRouter) no se toca ni se incluye
en los commits.

1. utils/panelSection: título de la sección según la ruta y el rol (TDD).
2. PanelShell: cajón móvil del sidebar y cabecera fija; AdminLayout y ProfessionalLayout lo usan sin
   tocar los sidebars. Pruebas RTL: abrir, Escape, tocar afuera, navegar.
3. DataTable en modo tarjeta con CSS (un solo DOM: data-label). Pruebas.
4. BookingStepper compacto por debajo de lg. Pruebas.
5. Modal: alto completo en celular, X y botones del pie de 44 px.
6. AppointmentFiltersBar: botón "Filtros" en celular (md:contents mantiene el escritorio).
7. AgendaGrid: un día a la vez por debajo de md; utils de fecha con TDD.
8. Button, Input, Select y SearchInput: min-h-11 y texto de 16 px en celular, sm:min-h-0.
9. Pantallas: PatientCard, modales con anchos fijos, barras de filtros de cada página, reporte (solo la
   barra de herramientas; la hoja y @media print no cambian).

Verificación manual (no hay pruebas para CSS): DevTools a 360, 375 y 768 px, y comparar 1280 px con main.
