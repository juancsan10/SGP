# 🔗Relaciones y Cardinalidades

### 👤 USUARIO — 🛡️ ROL
- Un usuario pertenece a un rol  
- Un rol tiene muchos usuarios  

**(ROL 1) ──── (N USUARIO)**  

---

### 👤 USUARIO — 📁 PROYECTO (Instructor)
- Un instructor puede tener muchos proyectos  
- Un proyecto tiene un instructor  

**(USUARIO 1) ──── (N PROYECTO)**  

---

### 👤 USUARIO — 📁 PROYECTO (Equipo)
- Relación muchos a muchos  

**(USUARIO N) ──── (N PROYECTO)**  
🔁 Intermedia: EQUIPO_PROYECTO  

---

### 📁 PROYECTO — 📊 FASE_PROYECTO
- Un proyecto tiene muchas fases  

**(PROYECTO 1) ──── (N FASE)**  

---

### 📊 FASE_PROYECTO — 📦 ENTREGABLE
- Una fase tiene muchos entregables  

**(FASE 1) ──── (N ENTREGABLE)**  

---

### 📁 PROYECTO — ✅ TAREA
- Un proyecto tiene muchas tareas  

**(PROYECTO 1) ──── (N TAREA)**  

---

### 👤 USUARIO — ✅ TAREA
- Un usuario puede tener muchas tareas asignadas  

**(USUARIO 1) ──── (N TAREA)**  

---

### 📁 PROYECTO — 💬 MENSAJE
- Un proyecto tiene muchos mensajes  

**(PROYECTO 1) ──── (N MENSAJE)**  

---

### 👤 USUARIO — 💬 MENSAJE
- Un usuario envía muchos mensajes  

**(USUARIO 1) ──── (N MENSAJE)**  

---

### 👤 USUARIO — 🔔 NOTIFICACION
- Un usuario recibe muchas notificaciones  

**(USUARIO 1) ──── (N NOTIFICACION)**  

---

### 📁 PROYECTO — 🧾 REPOSITORIO
- Un proyecto tiene un repositorio  

**(PROYECTO 1) ──── (1 REPOSITORIO)**  

---

### 👤 USUARIO — 📜 HISTORIAL_CAMBIOS
- Un usuario genera cambios  

**(USUARIO 1) ──── (N HISTORIAL)**  

---

## 📊 3. Observaciones Técnicas

- Todas las claves primarias son **AUTO_INCREMENT**
- Las claves foráneas garantizan integridad referencial
- Se normalizó hasta **3FN**
- Soporta crecimiento modular del sistema
- Preparado para auditoría y trazabilidad

---

## 🧠 4. Nivel del Modelo

✔ Completo  
✔ Escalable  
✔ Alineado con requisitos  
✔ Compatible con implementación SQL  

---

**📌 Estado:** Listo para diseño físico y UML  
**📌 Versión:** 1.0  
**📌 Proyecto:** Sistema de Gestión de Proyectos SENA  