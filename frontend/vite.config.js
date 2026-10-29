import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Proxy: en desarrollo, las peticiones a /api van al backend
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      // NUEVO: los enlaces de descarga/vista de archivos subidos apuntan
      // a rutas relativas "/uploads/...". Sin este proxy, en desarrollo
      // el navegador las pediría contra el propio Vite (5173) en vez del
      // backend.
      '/uploads': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  test: {
    // Todavía no hay tests unitarios (llegan en la semana 2): que no falle por eso
    passWithNoTests: true,
    coverage: {
      // Se mide la lógica de la interfaz. Queda fuera el arranque (main.jsx),
      // que solo monta la app y no tiene lógica de negocio.
      include: ['src/**/*.{js,jsx}'],
      exclude: ['src/main.jsx'],
      // Línea base de la semana 1. Este número solo puede subir.
      thresholds: { lines: 0, branches: 0, functions: 0, statements: 0 },
    },
  },
})
