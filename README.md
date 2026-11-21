# SGP SENA — Sistema de Gestión de Proyectos

Plataforma web para administrar, hacer seguimiento y controlar proyectos formativos del SENA, con gestión de usuarios, proyectos, equipos, tareas, entregables, comunicación, notificaciones e historial.

## Equipo

| Integrante | Rol |
|---|---|
| Rubiel Rodríguez | Backend / Base de datos |
| Juan Manuel Arcila | Frontend / UI-UX |
| Juan Carlos Sánchez | QA / Seguridad |

## Pila tecnológica

- Node.js 20
- Express 4
- React 18
- Vite 6.4.3
- MySQL 8
- Docker Compose
- pnpm 9.15.0
- JWT + bcrypt

## Requisitos

- Docker Desktop con Compose
- Git
- 4 GB de RAM disponibles para los contenedores

## Arranque completo

1. Copia `.env.example` a `.env` (PowerShell: `Copy-Item .env.example .env`; Git Bash: `cp .env.example .env`). El archivo `.env` no viene en el repositorio: sin él, Docker Compose se detiene con un mensaje indicando qué variable falta.
2. Cambia `DB_ROOT_PASSWORD`, `DB_PASSWORD` y `JWT_SECRET` por valores propios. `JWT_SECRET` debe tener al menos 32 caracteres. No cambies `DB_NAME` (el esquema crea la base con ese nombre) y evita `$`, `#`, comillas y espacios en los valores.
3. Ejecuta:

```bash
docker compose up -d --build
```

4. Carga los datos de ejemplo (usuarios, proyectos, tareas). La base de datos arranca vacía, así que sin este paso no existe ninguna cuenta para iniciar sesión:

```bash
docker compose exec backend node database/seed.js
```

   El seed vacía las tablas antes de insertar; ejecútalo solo en entornos de demo/desarrollo.

5. Abre `http://localhost:5173` e inicia sesión con una de las [cuentas de prueba](#cuentas-de-prueba).

El Compose levanta tres servicios: MySQL, backend y frontend. No se requiere instalar Node, pnpm ni MySQL en la máquina para ejecutar la entrega.

## Variables de entorno

Se definen en `.env` (copiado de `.env.example`; **nunca se sube al repositorio**). El backend las valida al arrancar: si falta alguna termina con código 1 y lista **todas** las que faltan.

| Variable | Obligatoria | Descripción |
|---|---|---|
| `DB_HOST`, `DB_NAME`, `DB_USER` | Sí en producción | Conexión a MySQL (`DB_NAME` = `SistemaGestionProyectosSENA`) |
| `DB_PASSWORD`, `DB_ROOT_PASSWORD` | Sí en producción | Claves de la BD |
| `JWT_SECRET` | Sí (≥ 32 caracteres) | Firma de los tokens; corto = error en producción, aviso en desarrollo |
| `JWT_EXPIRES_IN` | No (`2h`) | Vigencia del token |
| `FRONTEND_URL` | Sí en producción | Origen permitido por CORS |
| `PORT`, `NODE_ENV` | No (`3000`, `development`) | Puerto y modo |
| `MAIL_MODE` | No (`console`) | `smtp` envía correos reales y exige `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` |
| `LOGIN_RATE_LIMIT_MAX` | No (`5`) | Solo para el ambiente de E2E |
| `DATABASE_URL` | No | Reemplaza a `DB_*` (la usan los tests de integración) |

Mensajes al arrancar: `✅ Variables de entorno validadas`, `⚠️ ...` (aviso, sigue) o `❌ Configuración inválida` (se detiene).
Arquitectura y despliegue: [`docs/02-arquitectura/diagramas/`](docs/02-arquitectura/diagramas/README.md).

## Pruebas

| Nivel | Comando | Estado (2026-11-20) |
|---|---|---|
| Unitarias backend | `cd backend && pnpm test` | 321 casos ✅ |
| Unitarias frontend | `cd frontend && pnpm test` | 313 casos ✅ |
| Integración (BD `_test`, puerto 3307) | ver sección siguiente | 20 casos ✅ |
| E2E (Playwright) | `cd e2e && pnpm test` ([guía](e2e/README.md)) | 6 especificaciones |

Documentos: [plan de pruebas](docs/08-pruebas/plan-de-pruebas.md) · [informe de pruebas unitarias](docs/08-pruebas/informe-pruebas-unitarias.md) · [reporte de ejecución y defectos](docs/08-pruebas/reporte-ejecucion-y-defectos.md).

## Verificación

```bash
docker compose ps
```

El backend responde en `http://localhost:3000/` y el frontend en `http://localhost:5173`.

Si un puerto está ocupado, cambia `BACKEND_PORT` en `.env` o libera el puerto 5173 del host para el frontend.

Para reiniciar desde cero (borra la base de datos y los archivos subidos): `docker compose down -v` y vuelve a levantar.

## Tests de integración (BD de pruebas)

Corren contra una BD MySQL aparte (`SistemaGestionProyectosSENA_test`, puerto **3307**), nunca contra la de desarrollo. Sin `DATABASE_URL` se saltan, así que `pnpm test` y el CI no cambian.

```bash
# 1. Levantar la BD de pruebas (crea el esquema con database/docker-init/001_schema.sql)
docker compose -f docker-compose.test.yml up -d --wait

# 2. Correr los tests de integración (dos veces seguidas deben pasar igual)
cd backend
DATABASE_URL=mysql://sgp_test:sgp_test@127.0.0.1:3307/SistemaGestionProyectosSENA_test pnpm test:integration
cd ..

# 3. Apagarla y borrar los datos
docker compose -f docker-compose.test.yml down -v
```

Cada test limpia la BD antes de empezar (TRUNCATE de todas las tablas) y crea sus propios datos. La limpieza se niega a correr si la base no termina en `_test`.

## Cuentas de prueba

Después de ejecutar el seed (paso 4 del arranque) se dispone de:

| Cuenta | Rol | Contraseña |
|---|---|---|
| rubiel.tads@gmail.com | Administrador (único) | Definida en `ADMIN_CONTRASENA` de `backend/database/seed.js` |
| laura.gomez@sgpsena.local | Instructor | Sena2026* |
| miguel.torres@sgpsena.local | Instructor | Sena2026* |
| carlos.herrera@sgpsena.local | Aprendiz | Sena2026* |
| juan.martinez@sgpsena.local | Aprendiz | Sena2026* |

El seed crea 13 usuarios en total (1 administrador único, 2 instructores y 10 aprendices); la lista completa está en `backend/database/seed.js`.

> Para producción, las contraseñas de demostración deben sustituirse.

## Seguridad

- Registro público siempre crea Aprendiz.
- Creación de roles privilegiados protegida por autorización.
- Control de pertenencia a proyecto en recursos sensibles.
- Rate limit en autenticación.
- Secretos fuera del repositorio.
- CORS restringido en producción.
- Consultas MySQL parametrizadas.
- Respuestas de error genéricas.

Consulta `docs/06-seguridad/` para el procedimiento y el estado de los hallazgos.

## Estructura

```text
backend/      API REST
frontend/     React + Vite
 database/    Esquema y documentación de BD
docs/         Requisitos, arquitectura, API, gestión y seguridad
docker-compose.yml
```

## Flujo Git

`feature/*` / `fix/*` / `docs/*` → `develop` → `main`.

Usar commits convencionales a partir de esta versión y vincular cambios con GitHub Projects.

## Estado del MVP

Implementado: autenticación, roles, proyectos, equipos, tareas, fases, entregables, comentarios, evaluaciones, reuniones, mensajes, notificaciones, historial, calendario, línea de tiempo y recuperación de contraseña.

Aplazado: almacenamiento cloud, exportación PDF/Excel, tiempo real mediante WebSocket y cobertura automatizada extensa.

## Licencia

ISC. Uso académico/formativo.

## Documentación

La documentación completa está en [`docs/`](docs/), incluyendo RF/RNF, reglas de negocio, historias de usuario, API, seguridad, arquitectura y deuda técnica.

- **API REST** (incluye recuperación de contraseña, solicitudes, tiempo real y agenda): [`docs/03-api/api-rest.md`](docs/03-api/api-rest.md)
- **Conclusión de la documentación** (índice de diagramas, MER, UML, casos de uso): [`docs/00-general/conclusion-documentacion.md`](docs/00-general/conclusion-documentacion.md)
- **Gestión del proyecto**: [backlog puntuado](docs/04-gestion-proyecto/backlog-puntuado.md) · [retroalimentación del equipo](docs/05-equipo/feedback-equipo.md) · [deuda técnica priorizada](docs/07-deuda-tecnica.md) · [comparativo de backends](docs/09-reflexion/comparativo-cuatro-backends.md)
- **Matriz de trazabilidad** (RF → RN → CU → HU → endpoint real → estado verificado): [`docs/01-requisitos/matriz-trazabilidad.md`](docs/01-requisitos/matriz-trazabilidad.md)

### Nota de lockfiles

El repositorio mantiene `pnpm-lock.yaml`. Si se modifica alguna versión del manifiesto, regenera el lockfile con `pnpm install` antes del merge. La imagen Docker acepta temporalmente `--no-frozen-lockfile` para facilitar el primer build; en CI la política es `--frozen-lockfile`.
