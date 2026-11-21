# 📡 API REST – Sistema de Gestión de Proyectos SENA

## 📘 Descripción General
API REST para gestionar proyectos formativos del SENA.

- Arquitectura: REST
- Formato: JSON
- Autenticación: JWT

Base URL:
http://localhost:3000/api/v1

---

## 🔐 AUTENTICACIÓN

### POST /auth/login
Request:
{
  "correo": "usuario@sena.edu.co",
  "contrasena": "123456"
}

Response:
{
  "token": "jwt_token",
  "usuario": {
    "id": 1,
    "nombre": "Juan Perez",
    "rol": "Aprendiz"
  }
}

---

### POST /auth/register
{
  "nombres": "Juan",
  "apellidos": "Perez",
  "correo": "juan@sena.edu.co",
  "contrasena": "123456",
  "id_rol": 2
}

---

## 👤 USUARIOS
GET /usuarios  
GET /usuarios/{id}  
PUT /usuarios/{id}  
DELETE /usuarios/{id}  

---

## 📁 PROYECTOS

### POST /proyectos
{
  "nombre": "Sistema SENA",
  "descripcion": "Gestión de proyectos",
  "fecha_inicio": "2026-01-01",
  "fecha_fin": "2026-06-01"
}

GET /proyectos  
GET /proyectos/{id}  
PUT /proyectos/{id}  
DELETE /proyectos/{id}  

---

## 👥 EQUIPOS
POST /equipos  
GET /equipos/{id_proyecto}  

---

## 📊 FASES
POST /fases  
GET /fases/{id_proyecto}  

---

## 📦 ENTREGABLES
POST /entregables  
GET /entregables/{id_fase}  

---

## ✅ TAREAS
POST /tareas  
GET /tareas/{id_proyecto}  
PUT /tareas/{id}  

---

## 💬 MENSAJES
POST /mensajes  
GET /mensajes/{id_proyecto}  

---

## 🔔 NOTIFICACIONES
GET /notificaciones/{id_usuario}  
PUT /notificaciones/{id}  

---

## 🧾 REPOSITORIOS
POST /repositorios  

---

## 📊 HISTORIAL
GET /historial/{tabla}  

---

## 💭 COMENTARIOS *(nuevo)*
POST /comentarios  
GET /comentarios/{id_entregable}  
PUT /comentarios/{id}  
DELETE /comentarios/{id}  

Request (POST):
{
  "contenido": "Buen avance, falta ajustar el punto 3",
  "id_entregable": 1
}

> RN-015: retroalimentación de instructores/aprendices sobre un entregable.
> Solo el autor del comentario puede editarlo o borrarlo (o un Administrador).

---

## 📎 ARCHIVOS *(nuevo)*
POST /archivos  
GET /archivos/{id_entregable}  
DELETE /archivos/{id}  

Request (POST):
{
  "nombre_archivo": "informe-final.pdf",
  "ruta_archivo": "/uploads/entregables/informe-final.pdf",
  "id_entregable": 1
}

> Registra la referencia del archivo (nombre + ruta). La subida física del
> binario está pendiente para una fase posterior (ver `backend/README.md`).

---

## 📝 EVALUACIONES *(nuevo)*
POST /evaluaciones  
GET /evaluaciones/{id_entregable}  
PUT /evaluaciones/{id}  

Request (POST):
{
  "calificacion": 92.5,
  "comentarios": "Excelente documentación, cumple todos los criterios",
  "id_entregable": 5
}

> RN-016: solo se puede evaluar un entregable si el proyecto al que
> pertenece está en estado **"En Revisión"**. RN-013: la calificación debe
> estar entre 0 y 100. Solo Instructor/Administrador pueden calificar.

---

## 📅 REUNIONES *(nuevo)*
POST /reuniones  
GET /reuniones/{id_proyecto}  
PUT /reuniones/{id}  
DELETE /reuniones/{id}  

Request (POST):
{
  "titulo": "Seguimiento semanal",
  "descripcion": "Revisión de avance del sprint",
  "fecha_reunion": "2025-06-06T14:00:00",
  "lugar": "Sala virtual - Meet",
  "id_proyecto": 1
}

> RN-021: al programar una reunión se notifica automáticamente a todo el
> equipo del proyecto. Solo Instructor/Administrador programan reuniones.

---

## 🔗 GITHUB INTEGRATION *(nuevo)*
POST /github-integration  
GET /github-integration/{id_usuario}  
PUT /github-integration  
DELETE /github-integration  

Request (POST):
{
  "github_username": "carlos-lopez-dev",
  "github_token": "ghp_xxxxxxxxxxxxxxxxxxxx"
}

> Es un registro único por usuario (su propia cuenta de GitHub). El campo
> `github_token` **nunca** se devuelve en las respuestas JSON. Solo el
> propio usuario o un Administrador pueden consultar una integración.

---

## 🔐 SEGURIDAD
Authorization: Bearer TOKEN

---

## 📌 CÓDIGOS HTTP
200 OK  
201 Creado  
400 Error  
401 No autorizado  
404 No encontrado  
403 Prohibido (rol sin permiso)  
409 Conflicto (por ejemplo, borrar algo con registros hijos)  
429 Demasiados intentos (rate limit)  
500 Error servidor  


## Seguridad y nuevos endpoints

- `POST /api/v1/auth/register` crea únicamente Aprendices.
- `POST /api/v1/auth/users` crea Administradores/Instructores y requiere rol Administrador.
- `POST /api/v1/auth/password-reset/request` genera un código de 6 dígitos (ver «Recuperación de contraseña» más abajo).
- `POST /api/v1/auth/password-reset/verify` valida el código y devuelve `reset_session`.
- `POST /api/v1/auth/password-reset/confirm` cambia la contraseña con `reset_session`; se usa una sola vez.
- `PUT /api/v1/usuarios/:id/password` cambia contraseña con verificación de la actual.
- Los recursos de proyecto usan `requireProjectMember` para autorizar acceso.
- `GET /api/v1/agenda/:id_proyecto/calendario` devuelve tareas, entregables y reuniones.
- `GET /api/v1/agenda/:id_proyecto/timeline` devuelve cambios cronológicos del proyecto.


---

## 🔑 Recuperación de contraseña (HU-16)

Flujo de 3 pasos. Todas las respuestas del paso 1 son iguales exista o no el correo, para no revelar qué cuentas existen.

| Paso | Endpoint | Body | Respuesta |
|---|---|---|---|
| 1 | `POST /auth/password-reset/request` | `{ "correo": "..." }` | 200 `{ success, message }`. Envía un código de 6 dígitos al correo (vence en **3 min**, cooldown de 60 s entre solicitudes). |
| 2 | `POST /auth/password-reset/verify` | `{ "correo", "token": "123456" }` | 200 `{ data: { reset_session, session_expires_in } }`. Máx. **5 intentos** por código. |
| 3 | `POST /auth/password-reset/confirm` | `{ "correo", "reset_session", "nueva_contrasena" }` | 200 si cambia. `reset_session` (64 caracteres) vale **5 min** y es de un solo uso; la contraseña lleva 8 a 72 caracteres. |

Errores: 400 (validación o código inválido/vencido), 429 (límite de intentos). Los códigos y sesiones se guardan como hash HMAC-SHA256. Con `MAIL_MODE=console` el código se imprime en la consola del backend (solo desarrollo).

## 📨 SOLICITUDES AL ADMINISTRADOR *(nuevo)*

Prefijo `/solicitudes`. Requieren `Authorization: Bearer TOKEN`.

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| GET | `/solicitudes/tipos` | Cualquiera autenticado | Catálogo de tipos de solicitud |
| GET | `/solicitudes/mias` | Instructor, Aprendiz | Mis solicitudes |
| GET | `/solicitudes` | Administrador | Todas (filtros por query) |
| POST | `/solicitudes` | Instructor, Aprendiz | Crear `{ tipo, asunto, descripcion, id_proyecto? }` → 201; 400 si el tipo es inválido |
| PUT | `/solicitudes/:id/resolver` | Administrador | Resolver `{ estado, respuesta }` |
| POST | `/solicitudes/aprendices` | Instructor | Pedir la creación de un aprendiz |
| GET | `/solicitudes/aprendices/mias` | Instructor | Mis solicitudes de aprendices |
| GET | `/solicitudes/aprendices` | Administrador | Todas las solicitudes de aprendices |
| PUT | `/solicitudes/aprendices/:id/resolver` | Administrador | Aprobar (se crea la cuenta) o rechazar |

## 🔔 TIEMPO REAL (HU-28)

| Canal | Ruta | Uso |
|---|---|---|
| WebSocket | `ws://HOST:3000/ws` (en Docker: `/ws` por nginx) | Se autentica con el JWT; el servidor empuja las notificaciones nuevas |
| SSE (respaldo) | `GET /api/v1/notificaciones/stream` | Si el WebSocket no conecta |
| Estadísticas | `GET /api/v1/notificaciones/realtime/stats` | Solo Administrador |
| Difusión | `POST /api/v1/notificaciones/broadcast` | Administrador, Instructor |
| Enviadas | `GET /api/v1/notificaciones/enviadas` | Administrador, Instructor |

## 📅 AGENDA

- `GET /agenda/:id_proyecto/calendario` — tareas, entregables y reuniones del proyecto.
- `GET /agenda/:id_proyecto/timeline` — cambios cronológicos (línea de tiempo, HU-32).

## ⚙️ Configuración del backend (variables de entorno)

Ver `README.md`, sección «Variables de entorno». El backend valida todas al arrancar y, si falta alguna, termina con código 1 listando cada una.
