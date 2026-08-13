# Backend — SGP SENA

API REST construida en **Node.js + Express + MySQL** (`mysql2`), autenticación con **JWT** y contraseñas hasheadas con **bcrypt**.

## Requisitos

- Node.js
- La base de datos corriendo en Docker (ver `../docker-compose.yml` y `../database/README.md`) — no se necesita MySQL instalado localmente.

## Cómo levantarlo

```bash
# 1. Desde la raíz del repo: levantar la base de datos
cp .env.example .env      # si no existe aún
docker compose up -d

# 2. Desde backend/: instalar dependencias y configurar el entorno
cd backend
cp .env.example .env
npm install

# 3. Cargar datos de ejemplo (usuarios de prueba, proyectos, etc.)
node database/seed.js

# 4. Levantar el servidor
npm run dev     # con recarga automática (nodemon)
# o
npm start
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

## ⚠️ Cobertura actual de la API

El esquema de la base de datos tiene **16 tablas** (ver `../database/docker-init/001_schema.sql`),
pero este backend hoy solo implementa rutas/controladores para **11**:

`auth`, `usuarios`, `proyectos`, `equipos`, `fases`, `entregables`, `tareas`, `mensajes`,
`notificaciones`, `repositorios`, `historial`.

**Pendiente por implementar** (tablas ya existen en la BD, faltan controladores + rutas):
- [ ] `comentarios`
- [ ] `archivos`
- [ ] `evaluaciones`
- [ ] `reuniones`
- [ ] `github_integration`

## Referencia

La especificación completa de endpoints está en [`../docs/03-api/api-rest.md`](../docs/03-api/api-rest.md).
