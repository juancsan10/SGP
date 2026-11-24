import { defineConfig, devices } from '@playwright/test';

// Puertos propios de los E2E: así nunca se reutiliza por error el backend o el Vite
// de desarrollo (que apuntan a la BD de desarrollo). Se cambian con FRONT_PORT y BACK_PORT.
const frontPort = Number(process.env.FRONT_PORT ?? 5199);
const backPort = Number(process.env.BACK_PORT ?? 3100);

// BD de pruebas de la semana 6 (docker-compose.test.yml). global-setup.js se niega a
// correr si el nombre de la base no termina en _test.
export const DATABASE_URL = process.env.DATABASE_URL
  ?? 'mysql://sgp_test:sgp_test@127.0.0.1:3307/SistemaGestionProyectosSENA_test';
export const BACKEND_URL = `http://localhost:${backPort}`;

export default defineConfig({
  testDir: './tests',
  globalSetup: './global-setup.js',
  use: {
    baseURL: `http://localhost:${frontPort}`,
    // Si un test falla y se reintenta, guarda la traza para verla con "pnpm report"
    trace: 'on-first-retry',
  },
  reporter: [['list'], ['html', { open: 'never' }]],
  retries: process.env.CI ? 1 : 0,
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // Playwright levanta el backend contra la BD de pruebas y el frontend con Vite.
  // Se lanzan con node y no con pnpm para que Playwright los pueda cerrar al terminar.
  webServer: [
    {
      command: 'node server.js',
      cwd: '../backend',
      url: `${BACKEND_URL}/`,
      reuseExistingServer: false,
      env: {
        PORT: String(backPort),
        DATABASE_URL,
        JWT_SECRET: 'secreto_solo_para_los_e2e_de_sgp_32_caracteres',
        FRONTEND_URL: `http://localhost:${frontPort}`,
        MAIL_MODE: 'console',
        // El límite de logins fallidos es estado compartido del servidor: con --repeat-each
        // el test de contraseña incorrecta lo agotaba y los demás recibían 429.
        LOGIN_RATE_LIMIT_MAX: '1000',
      },
    },
    {
      command: `node node_modules/vite/bin/vite.js --port ${frontPort} --strictPort`,
      cwd: '../frontend',
      url: `http://localhost:${frontPort}`,
      reuseExistingServer: false,
      env: { BACKEND_URL },
    },
  ],
});
