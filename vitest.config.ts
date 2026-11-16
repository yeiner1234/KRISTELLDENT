import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// Separado de vite.config.ts: las pruebas no necesitan Tailwind ni el React Compiler.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // También la lógica pura de las Edge Functions (archivos sin imports de Deno).
    include: ['src/**/*.test.{ts,tsx}', 'supabase/functions/**/*.test.ts'],
    // Evitan que src/lib/supabase.ts lance error al importarse en las pruebas.
    env: { VITE_SUPABASE_URL: 'http://localhost:54321', VITE_SUPABASE_PUBLISHABLE_KEY: 'test-key' },
  },
})
