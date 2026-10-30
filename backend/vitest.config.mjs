import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Todavía no hay tests unitarios (llegan en la semana 2): que no falle por eso
    passWithNoTests: true,
    coverage: {
      // Se mide la lógica de negocio que está en src/. server.js queda fuera porque
      // está en la raíz. También se excluye el adaptador de BD (config/db.js), que
      // solo crea la conexión a MySQL y se prueba con integración en la semana 6.
      include: ['src/**/*.js'],
      exclude: ['src/config/db.js'],
      // Línea base de la semana 1. Este número solo puede subir.
      thresholds: { lines: 0, branches: 0, functions: 0, statements: 0 },
    },
  },
});
