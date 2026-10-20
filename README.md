# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is enabled on this template. See [this documentation](https://react.dev/learn/react-compiler) for more information.

Note: This will impact Vite dev & build performances.
You can also try [the experimental native React Compiler support in plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md#rust-react-compiler) by using `compiler: true` in the plugin options instead of using the Babel plugin.

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.
# KRISTELLDENT

## Recuperación de contraseña

Flujo: la usuaria entra a `/login/recuperar`, escribe su correo y recibe un enlace. El enlace abre `/actualizar-contrasena`, donde define una nueva contraseña (mínimo 8 caracteres) y entra a su panel.

- La página siempre muestra el mismo mensaje, esté o no registrado el correo.
- El enlace sirve una sola vez y vence a los 30 minutos (el frontend también lo comprueba con `recovery_sent_at`).
- `/actualizar-contrasena` solo muestra el formulario si se llegó desde el enlace del correo; con una sesión normal no se puede cambiar la contraseña ahí.

`supabase/config.toml` solo aplica al Supabase local (`npx supabase start`). En el proyecto alojado en supabase.com hay que configurarlo a mano en el dashboard, sección **Authentication**:

1. Expiración del enlace/OTP de email: `1800` segundos.
2. Longitud mínima de contraseña: `8`.
3. Agregar `https://<TU_DOMINIO>/actualizar-contrasena` a las Redirect URLs permitidas.
