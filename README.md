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

## Verificación

```bash
docker compose ps
```

El backend responde en `http://localhost:3000/` y el frontend en `http://localhost:5173`.

Si un puerto está ocupado, cambia `BACKEND_PORT` en `.env` o libera el puerto 5173 del host para el frontend.

Para reiniciar desde cero (borra la base de datos y los archivos subidos): `docker compose down -v` y vuelve a levantar.

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

- **Matriz de trazabilidad** (RF → RN → CU → HU → endpoint real → estado verificado): [`docs/01-requisitos/matriz-trazabilidad.md`](docs/01-requisitos/matriz-trazabilidad.md)

### Nota de lockfiles

El repositorio mantiene `pnpm-lock.yaml`. Si se modifica alguna versión del manifiesto, regenera el lockfile con `pnpm install` antes del merge. La imagen Docker acepta temporalmente `--no-frozen-lockfile` para facilitar el primer build; en CI la política es `--frozen-lockfile`.
