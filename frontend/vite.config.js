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
    // DOM simulado para los tests de componentes con Testing Library
    environment: 'jsdom',
    setupFiles: ['./tests/setup.js'],
    passWithNoTests: true,
    coverage: {
      // Se mide la lógica de la interfaz. Quedan fuera el arranque (main.jsx),
      // que solo monta la app, y el cliente HTTP (services/api.js), que solo
      // llama al backend y se prueba con MSW en la semana 5.
      include: ['src/**/*.{js,jsx}'],
      exclude: ['src/main.jsx', 'src/services/api.js'],
      // Línea base de la semana 1. Este número solo puede subir.
      thresholds: { lines: 0, branches: 0, functions: 0, statements: 0 },
    },
  },
})
