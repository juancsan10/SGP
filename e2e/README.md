# Pruebas E2E con Playwright

Prueban el login de SGP como lo usa una persona, desde el navegador.

| Test | Qué verifica |
|---|---|
| `login-exitoso.spec.js` | Con una cuenta válida entra al dashboard y saluda al usuario |
| `login-contrasena-incorrecta.spec.js` | Con una contraseña incorrecta muestra "Credenciales inválidas" y se queda en el login |
| `login-campos-vacios.spec.js` | Si falta la contraseña muestra "Completa correo y contraseña." sin llamar al backend |

## Cómo correrlos

1. Levanta la BD y el backend, y carga el seed (desde la raíz del repo):

   ```bash
   docker compose up -d --build db backend
   docker compose exec backend node database/seed.js
   ```

   No levantes el contenedor `frontend`: Playwright arranca Vite en el 5173 con el código actual. Si ya está corriendo, apágalo con `docker compose stop frontend`, o Playwright usará esa versión compilada, que puede estar desactualizada.

2. Instala las dependencias del frontend (Playwright levanta Vite por su cuenta):

   ```bash
   cd frontend && pnpm install
   ```

3. Instala Playwright y el navegador (solo la primera vez):

   ```bash
   cd e2e
   pnpm install
   pnpm exec playwright install chromium
   ```

4. Corre los tests:

   ```bash
   pnpm test              # en la terminal
   pnpm exec playwright test --headed   # viendo el navegador
   pnpm test:ui           # modo interactivo
   pnpm report            # reporte HTML de la última ejecución
   ```

## Ojo con el rate limit del login

El backend bloquea el login después de **5 intentos fallidos en 15 minutos** por cliente. El test de contraseña incorrecta hace un intento fallido cada vez que corre, así que si lo ejecutas muchas veces seguidas empieza a ver "Demasiados intentos…". Para reiniciar el contador: `docker compose restart backend`.
