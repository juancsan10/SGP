import { defineConfig, devices } from '@playwright/test';

// Puerto del frontend. Si el 5173 está ocupado: FRONT_PORT=5199 pnpm test
const port = Number(process.env.FRONT_PORT ?? 5173);

export default defineConfig({
  testDir: './tests',
  use: {
    baseURL: `http://localhost:${port}`,
    // Si un test falla y se reintenta, guarda la traza para verla con "pnpm report"
    trace: 'on-first-retry',
  },
  reporter: [['list'], ['html', { open: 'never' }]],
  retries: process.env.CI ? 1 : 0,
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // Playwright levanta el frontend con Vite. La BD y el backend (puerto 3000)
  // se levantan antes con Docker Compose (ver e2e/README.md).
  // Se lanza vite con node y no con pnpm para que Playwright lo pueda cerrar al terminar.
  webServer: {
    command: `node node_modules/vite/bin/vite.js --port ${port} --strictPort`,
    cwd: '../frontend',
    url: `http://localhost:${port}`,
    reuseExistingServer: !process.env.CI,
  },
});
