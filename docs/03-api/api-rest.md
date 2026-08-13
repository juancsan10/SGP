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
