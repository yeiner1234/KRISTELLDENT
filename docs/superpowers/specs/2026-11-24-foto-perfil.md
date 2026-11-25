# Foto de perfil del personal

- Cualquier cuenta interna puede tener foto. La cambian: la propia persona (desde su nombre en el sidebar
  profesional o su avatar en la cabecera admin), admin_global (la de cualquiera, desde Equipo) y admin_sede
  (la del personal de su sede, desde Equipo).
- Las fotos de las profesionales activas salen en la página principal ("Quién te va a atender").
- Se quita el botón "Ver profesionales" de esa sección.
- La foto se recorta en cuadrado al centro, se reduce a 512 px y se sube en JPG al bucket público "avatars"
  (<id>/<marca>.jpg); la anterior se borra.

Verificación SQL: ver el final de supabase/migrations/20261124001200_foto_perfil.sql.
