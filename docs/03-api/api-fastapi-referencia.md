# Especificación de Referencia — Backend Alternativo FastAPI (Python)

Este documento registra la especificación y estructura de la API REST desarrollada en el ejercicio complementario con **FastAPI** (Python 3.11), referenciada en el cuadro comparativo de `docs/09-reflexion/comparativo-cuatro-backends.md`.

## 1. Características Técnicas
- **Framework:** FastAPI 0.104+ sobre servidor ASGI Uvicorn.
- **ORM / Persistencia:** SQLAlchemy 2.0 con motor asíncrono y PostgreSQL/SQLite.
- **Validación y Serialización:** Pydantic v2 (esquemas `BaseModel` fuertemente tipados).
- **Documentación interactiva:** Generada automáticamente en `/docs` (Swagger UI) y `/redoc` (ReDoc).

## 2. Endpoints Principales del Ejercicio

### Autenticación (`/api/v1/auth`)
- `POST /api/v1/auth/token`
  - Recibe credenciales en formato `OAuth2PasswordRequestForm` (`username`, `password`).
  - Responde: `200 OK` con `{ "access_token": "...", "token_type": "bearer" }` o `401 Unauthorized`.
- `GET /api/v1/auth/me`
  - Retorna la información del usuario autenticado a partir del token JWT.

### Proyectos (`/api/v1/proyectos`)
- `GET /api/v1/proyectos/`
  - Parámetros de consulta: `skip: int = 0`, `limit: int = 50`.
  - Responde: `200 OK` con lista de proyectos serializados con esquema Pydantic `ProyectoOut`.
- `POST /api/v1/proyectos/`
  - Body: esquema `ProyectoCreate` (`nombre`, `descripcion`, `id_instructor`, `fecha_inicio`, `fecha_fin`).
  - Validación: Pydantic valida tipos y restricciones antes de ejecutar la función.
  - Responde: `201 Created` o `422 Unprocessable Entity` (error de validación con detalle de campos).
- `GET /api/v1/proyectos/{id}`
  - Responde: `200 OK` con el proyecto o `404 Not Found`.

### Tareas y Entregables (`/api/v1/tareas`)
- `POST /api/v1/tareas/`
  - Body: esquema `TareaCreate` (`id_proyecto`, `titulo`, `descripcion`, `id_aprendiz`).
  - Responde: `201 Created` o `422 Unprocessable Entity`.
- `PATCH /api/v1/tareas/{id}/estado`
  - Body: `{ "estado": "completada" }` (validado mediante Enum de Python).
  - Responde: `200 OK`.

## 3. Comparación con el Enfoque Express de SGP
1. **Contrato vivo:** Mientras en SGP la documentación requirió redacción manual en `api-rest.md` y tendió a desincronizarse, en FastAPI el schema OpenAPI se deriva directamente de las firmas de función y esquemas Pydantic.
2. **Manejo de Errores de Validación:** FastAPI estandariza las respuestas con código HTTP `422` y array estructurado de errores, frente a `express-validator` en Node.js que requiere middleware personalizado para formatear la respuesta.
