# Responsive para celular

Objetivo: que todo el sistema se use bien en celular (pública, admin, profesional y técnica) sin cambiar
nada en escritorio. Solo diseño y maquetación: sin cambios de lógica, datos ni permisos.

Anchos: 360, 390, 768, 1024 y 1280 px. Mobile-first con sm, md y lg de Tailwind.

Regla del usuario: "nada que afecte lo que ya tenemos en web para laptop; solo para celular". Las clases
de celular van sin prefijo y los valores actuales se restauran con sm:/md:/lg:, así que desde 1024 px el
resultado es idéntico al de antes.

Componentes compartidos:
1. Layout de los paneles: sidebar deslizable con hamburguesa y fondo oscuro; se cierra al elegir una
   opción, al tocar afuera o con Escape. Cabecera fija con el nombre de la sección.
2. DataTable: tarjetas (etiqueta: valor) con las acciones abajo; en escritorio, tabla.
3. Modal: pantalla completa en celular; se mantiene el 90vh de escritorio.
4. Filtros: botón "Filtros" en celular.
5. AgendaGrid: un día a la vez (L M X J V S y flechas); semana completa desde tablet.
6. Pasos de la reserva: "Paso 3 de 8 · Profesional" con barra de progreso.
7. Formularios y botones: ancho completo y 44 px de alto en celular.

Pantallas: pública, admin, profesional y técnica, y reportes (lo impreso no cambia).
Sin scroll horizontal a 360 px, salvo una tabla dentro de su propio contenedor. Texto mínimo de 14 px.
Pruebas: menú móvil (Escape, tocar afuera, navegar), DataTable en tarjeta y pasos compactos.
