import { defineConfig } from 'vitest/config';

// Semana 8: en el CI, sin DATABASE_URL los 21 tests se saltarían y el job quedaría en verde
// sin haber probado nada (el CI que miente). Ahí se falla de una vez con un mensaje claro.
if (process.env.CI && !process.env.DATABASE_URL) {
  throw new Error('Falta DATABASE_URL: en el CI los tests de integración no se pueden saltar.');
}

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
