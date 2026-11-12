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
      // Proxy para WebSocket de notificaciones en tiempo real (RF4.4 / HU-28)
      '/ws': {
        target: 'ws://localhost:3000',
        ws: true,
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
    // DOM simulado para los tests de componentes con Testing Library
    environment: 'jsdom',
    setupFiles: ['./tests/setup.js'],
    passWithNoTests: true,
    coverage: {
      // Se mide la lógica de la interfaz. Queda fuera solo el arranque (main.jsx),
      // que monta la app. El cliente HTTP (services/api.js) se mide desde la
      // semana 5: lo prueba tests/api.test.js con MSW.
      include: ['src/**/*.{js,jsx}'],
      exclude: ['src/main.jsx'],
      // Línea base de la semana 1. Este número solo puede subir.
      thresholds: { lines: 55, branches: 46, functions: 45, statements: 51 },
    },
  },
})
