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

1. Copia `.env.example` a `.env`.
2. Cambia `DB_ROOT_PASSWORD`, `DB_PASSWORD` y `JWT_SECRET` por valores propios. `JWT_SECRET` debe tener al menos 32 caracteres.
3. Ejecuta:

```bash
docker compose up -d --build
```

4. Abre `http://localhost:5173`.

El Compose levanta tres servicios: MySQL, backend y frontend. No se requiere instalar Node, pnpm ni MySQL en la máquina para ejecutar la entrega.

## Verificación

```bash
docker compose ps
```

El backend responde en `http://localhost:3000/` y el frontend en `http://localhost:5173`.

Si un puerto está ocupado, cambia `BACKEND_PORT` en `.env` o libera el puerto 5173 del host para el frontend.

## Cuentas de prueba

Después de ejecutar el seed de desarrollo (`backend/database/seed.js`) se dispone de:

| Cuenta | Rol | Contraseña |
|---|---|---|
| juan@mail.com | Administrador | 123 |
| maria@mail.com | Instructor | 123 |
| luis@mail.com | Instructor | 123 |
| carlos@mail.com | Aprendiz | 123 |
| ana@mail.com | Aprendiz | 123 |

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

Aplazado: almacenamiento cloud, exportación PDF/Excel, tiempo real mediante WebSocket, Proyección Profesional y cobertura automatizada extensa.

## Licencia

ISC. Uso académico/formativo.

## Documentación

La documentación completa está en [`docs/`](docs/), incluyendo RF/RNF, reglas de negocio, historias de usuario, API, seguridad, arquitectura y deuda técnica.

### Nota de lockfiles

El repositorio mantiene `pnpm-lock.yaml`. Si se modifica alguna versión del manifiesto, regenera el lockfile con `pnpm install` antes del merge. La imagen Docker acepta temporalmente `--no-frozen-lockfile` para facilitar el primer build; en CI la política es `--frozen-lockfile`.
