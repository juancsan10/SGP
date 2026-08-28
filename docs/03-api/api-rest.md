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
500 Error servidor  
