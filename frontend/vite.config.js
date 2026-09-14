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
})
