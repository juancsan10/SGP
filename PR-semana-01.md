## ¿Qué prueba este PR?

Primer E2E del proyecto con Playwright sobre el flujo de inicio de sesión, que es la puerta de entrada a todo SGP. Cada integrante probó un caso distinto:

| Integrante | Test | Comportamiento verificado |
|---|---|---|
| Rubiel Rodríguez | `login-exitoso.spec.js` | Con una cuenta válida (aprendiz del seed) entra a `/dashboard` y ve "Hola, Carlos Andrés" |
| Juan Carlos Sánchez | `login-contrasena-incorrecta.spec.js` | Con contraseña incorrecta se muestra "Credenciales inválidas" y no sale del login |
| Juan Manuel Arcila | `login-campos-vacios.spec.js` | Sin contraseña se muestra "Completa correo y contraseña." y no sale del login |

También se configuró la cobertura con Vitest en frontend y backend y se registró la línea base.

### Hallazgo de accesibilidad (corregido)

`getByLabel('Contraseña')` no encontraba el campo: el `<label>` envuelve también el botón "Ver", así que el nombre accesible del input era "Contraseña Ver". Se agregó `aria-label="Contraseña"` al input en `LoginPage.jsx`.

### Cobertura (línea base)

| Parte | Comando | Líneas |
|---|---|---|
| Frontend | `cd frontend && pnpm test` | 0% |
| Backend | `cd backend && pnpm test` | 0% |

Es 0% porque todavía no hay tests unitarios y los E2E no cuentan para la cobertura. Quedó como umbral en `vite.config.js` y `vitest.config.mjs`. Se comprobó que el umbral funciona: con 99% el comando falla.

### Lo hicimos fallar a propósito

| Test | Cambio en la app | Resultado |
|---|---|---|
| Login exitoso | `navigate('/dashboard')` → `navigate('/proyectos')` | Falla: esperaba `/dashboard`, recibió `/proyectos` |
| Contraseña incorrecta | Mostrar siempre "Error al iniciar sesión" en vez del mensaje del backend | Falla: esperaba "Credenciales inválidas" |
| Campos vacíos | Quitar el mensaje "Completa correo y contraseña." | Falla: no aparece el `alert` |

## Capas

- **Capa del autor esta semana**: E2E (todo el grupo, semana de arranque)
- **Capa del revisor esta semana**: E2E (cada uno revisa el test de **otro** integrante)

## Checklist

- [x] Los tests siguen el patrón AAA (Arrange, Act, Assert)
- [x] Los nombres de los tests describen el comportamiento esperado
- [x] Hice fallar cada test al menos una vez para comprobar que detecta el error
- [x] Los tests pasan en local
- [x] No hay credenciales ni datos reales en los tests (se usa la cuenta de demo del seed)

## ¿Cómo lo ejecuto?

```bash
docker compose up -d --build db backend
docker compose exec backend node database/seed.js
cd frontend && pnpm install && cd ..
cd e2e && pnpm install && pnpm exec playwright install chromium
pnpm test
```

> La rama se llama `semana-01` y no `test/semana-01` porque el repo ya tiene una rama `test` y Git no permite crear `test/...` mientras exista.
