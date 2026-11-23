import { defineConfig } from 'vitest/config';

// Tests de integración contra la BD de pruebas (docker-compose.test.yml).
// - Solo corren si existe DATABASE_URL; si no, cada archivo se salta.
// - Un archivo a la vez: todos comparten la misma BD y la limpian antes de cada test.
export default defineConfig({
  test: {
    include: ['tests/integration/**/*.test.js'],
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 30000,
  },
});
