# Backend — SGP SENA

API REST construida en **Node.js + Express + MySQL** (`mysql2`), autenticación con **JWT** y contraseñas hasheadas con **bcrypt**.

## Requisitos

- Node.js 18+
- **pnpm** (gestor de paquetes del proyecto, fijado en `packageManager` dentro de `package.json`).
  Si no lo tienes: `corepack enable` (viene con Node 16.9+) o `npm install -g pnpm`.
- La base de datos corriendo en Docker (ver `../docker-compose.yml` y `../database/README.md`) — no se necesita MySQL instalado localmente.

## Cómo levantarlo

```bash
# 1. Desde la raíz del repo: levantar la base de datos
cp .env.example .env      # si no existe aún
docker compose up -d

# 2. Desde backend/: instalar dependencias y configurar el entorno
cd backend
cp .env.example .env
pnpm install

# 3. Cargar datos de ejemplo (usuarios de prueba, proyectos, etc.)
node database/seed.js

# 4. Levantar el servidor
pnpm run dev     # con recarga automática (nodemon)
# o
pnpm start
```

El servidor queda disponible en `http://localhost:3000`, con la API base en `http://localhost:3000/api/v1`.

**Importante:** las variables `DB_NAME`, `DB_USER`, `DB_PASSWORD` y `DB_PORT` en `backend/.env` deben coincidir con las del `.env` de la raíz del repo, ya que ahí se definen las credenciales del contenedor MySQL.

## Cuentas de prueba (tras correr `seed.js`)

| Correo | Rol | Contraseña |
|---|---|---|
| juan@mail.com | Administrador | 123 |
| maria@mail.com | Instructor | 123 |
| luis@mail.com | Instructor | 123 |
| carlos@mail.com | Aprendiz | 123 |
| ana@mail.com | Aprendiz | 123 |

Más detalle en [`database/README_seedjs.md`](database/README_seedjs.md).

## Estructura

```
backend/
├── server.js              # punto de entrada
├── pnpm-lock.yaml          # lockfile de pnpm (se versiona; no editar a mano)
├── src/
│   ├── app.js
│   ├── config/db.js        # conexión a MySQL (pool)
│   ├── controllers/
│   ├── routes/
│   └── middlewares/
└── database/
    ├── seed.js              # datos de ejemplo (bcrypt)
    └── README_seedjs.md
```

## ✅ Cobertura actual de la API

El esquema de la base de datos tiene **16 tablas** (ver `../database/docker-init/001_schema.sql`)
y el backend ya implementa rutas/controladores para las **16**:

`auth`, `usuarios`, `proyectos`, `equipos`, `fases`, `entregables`, `tareas`, `mensajes`,
`notificaciones`, `repositorios`, `historial`, `comentarios`, `archivos`, `evaluaciones`,
`reuniones`, `github-integration`.

### Módulos agregados en esta corrección

| Recurso | Endpoints | Reglas de negocio aplicadas |
|---|---|---|
| `comentarios` | `POST /comentarios` · `GET /comentarios/:id_entregable` · `PUT /comentarios/:id` · `DELETE /comentarios/:id` | RN-015 (retroalimentación). Solo el autor edita/borra su comentario (o un Administrador). |
| `archivos` | `POST /archivos` · `GET /archivos/:id_entregable` · `DELETE /archivos/:id` | Registra nombre + ruta del archivo. La subida física del binario queda para una fase posterior (ver sección "Pendiente" abajo). |
| `evaluaciones` | `POST /evaluaciones` · `GET /evaluaciones/:id_entregable` · `PUT /evaluaciones/:id` | RN-016 (solo se evalúa un entregable si el proyecto está en estado "En Revisión") · RN-013 (calificación entre 0 y 100). Solo Instructor/Administrador califican. |
| `reuniones` | `POST /reuniones` · `GET /reuniones/:id_proyecto` · `PUT /reuniones/:id` · `DELETE /reuniones/:id` | RN-021 (notifica automáticamente a todo el equipo del proyecto al programarse). Solo Instructor/Administrador programan. |
| `github-integration` | `POST /github-integration` · `GET /github-integration/:id_usuario` · `PUT /github-integration` · `DELETE /github-integration` | Es 1 registro por usuario (su propia cuenta de GitHub). `github_token` **nunca** se expone en las respuestas JSON. Solo el propio usuario o un Administrador pueden consultarlo. |

## 📦 Dependencias

Este proyecto usa **pnpm** como gestor de paquetes (no `npm`/`yarn`). Instalar con:
```bash
pnpm install
```

Todas las versiones en `package.json` están **pineadas** (versión exacta, sin `^` ni `~`) y
fueron revisadas con `pnpm audit` antes de fijarlas — **0 vulnerabilidades conocidas** al
momento de este commit. Si se agrega una dependencia nueva, se recomienda:
1. Instalarla con `pnpm add <paquete>@<version-exacta>`
2. Correr `pnpm audit` y resolver cualquier alerta antes de hacer commit
3. Confirmar que quedó sin el prefijo `^`/`~` en `package.json`

## ⚠️ Pendiente (fuera del alcance de esta corrección)

- Subida física de archivos (hoy `archivos` solo guarda nombre + ruta como texto).
- Consumo real de la API de GitHub con el token guardado en `github_integration`
  (hoy solo se almacena la credencial; no se listan commits/ramas todavía).
- WebSockets/polling para mensajes y notificaciones en tiempo real (hoy requieren recargar).
- Exportación de reportes a PDF/Excel.

## Referencia

La especificación completa de endpoints está en [`../docs/03-api/api-rest.md`](../docs/03-api/api-rest.md).
