# 📊 MODELO COMPLETO DEL SISTEMA – SISTEMA DE GESTIÓN DE PROYECTOS SENA

---

## 🧩 1. Modelo Entidad-Relación (ER)

### 📌 Entidades y Atributos

#### 👤 Usuario
- **id_usuario** (PK, INT)
- nombres (VARCHAR)
- apellidos (VARCHAR)
- correo (VARCHAR, UNIQUE)
- contraseña (VARCHAR)
- ficha (VARCHAR)
- programa_formacion (VARCHAR)
- estado (BOOLEAN)
- fecha_registro (DATETIME)
- **id_rol** (FK)

---

#### 🎭 Rol
- **id_rol** (PK, INT)
- nombre_rol (VARCHAR)
- descripcion (VARCHAR)

---

#### 📁 Proyecto
- **id_proyecto** (PK, INT)
- nombre (VARCHAR)
- descripcion (TEXT)
- fecha_inicio (DATE)
- fecha_fin (DATE)
- estado (VARCHAR)
- porcentaje_avance (DECIMAL)
- **id_instructor** (FK → Usuario)

---

#### 👥 Equipo_Proyecto (Relación N:M)
- **id_equipo** (PK, INT)
- **id_usuario** (FK)
- **id_proyecto** (FK)
- rol_en_equipo (VARCHAR)

---

#### 📊 Fase_Proyecto
- **id_fase** (PK, INT)
- nombre_fase (VARCHAR)
- descripcion (TEXT)
- fecha_inicio (DATE)
- fecha_fin (DATE)
- porcentaje_avance (DECIMAL)
- **id_proyecto** (FK)

---

#### 📦 Entregable
- **id_entregable** (PK, INT)
- nombre (VARCHAR)
- descripcion (TEXT)
- fecha_entrega (DATE)
- fecha_entregado (DATE)
- estado (VARCHAR)
- url_drive (VARCHAR)
- version (VARCHAR)
- **id_fase** (FK)

---

#### ✅ Tarea
- **id_tarea** (PK, INT)
- titulo (VARCHAR)
- descripcion (TEXT)
- fecha_inicio (DATE)
- fecha_vencimiento (DATE)
- estado (VARCHAR)
- prioridad (VARCHAR)
- porcentaje_avance (DECIMAL)
- **id_proyecto** (FK)
- **id_asignado** (FK → Usuario)

---

#### 💬 Mensaje
- **id_mensaje** (PK, INT)
- contenido (TEXT)
- fecha_envio (DATETIME)
- **id_remitente** (FK)
- **id_proyecto** (FK)

---

#### 🔔 Notificación
- **id_notificacion** (PK, INT)
- titulo (VARCHAR)
- mensaje (TEXT)
- tipo (VARCHAR)
- leida (BOOLEAN)
- fecha_envio (DATETIME)
- **id_usuario** (FK)

---

#### 🧾 Historial_Cambios
- **id_historial** (PK, INT)
- tabla_afectada (VARCHAR)
- id_registro (INT)
- accion (VARCHAR)
- fecha_cambio (DATETIME)
- **id_usuario** (FK)

---

### 🔗 Relaciones y Cardinalidad

- Usuario (1) ─── (N) Proyecto (como instructor)
- Usuario (N) ─── (N) Proyecto → Equipo_Proyecto
- Proyecto (1) ─── (N) Fase
- Fase (1) ─── (N) Entregable
- Proyecto (1) ─── (N) Tarea
- Usuario (1) ─── (N) Tarea
- Proyecto (1) ─── (N) Mensaje
- Usuario (1) ─── (N) Notificación

---

## 🧠 2. Diagrama de Clases UML (Descripción)

### Clases principales:

#### Clase Usuario
- Atributos: id, nombres, correo, contraseña
- Métodos:
  - iniciarSesion()
  - cerrarSesion()

---

#### Clase Proyecto
- Atributos: nombre, estado, porcentaje_avance
- Métodos:
  - crearProyecto()
  - actualizarEstado()
  - calcularAvance()

---

#### Clase Tarea
- Atributos: titulo, estado, prioridad
- Métodos:
  - asignarUsuario()
  - actualizarEstado()

---

#### Clase Entregable
- Métodos:
  - subirArchivo()
  - validarEntrega()

---

### Relaciones UML:
- Asociación: Usuario ↔ Proyecto  
- Agregación: Proyecto → Tareas  
- Composición: Proyecto → Fases → Entregables  

---

## 🏗️ 3. Arquitectura del Sistema

### 📌 Patrón Arquitectónico

**Arquitectura en Capas (3 capas):**

1. **Presentación**
   - Frontend (HTML, CSS, JS)
2. **Lógica de Negocio**
   - Backend (Node.js / PHP)
3. **Persistencia**
   - Base de datos (MySQL / PostgreSQL)

---

### 📌 Justificación

- Separación de responsabilidades  
- Escalabilidad  
- Mantenibilidad  
- Cumple restricciones del SENA  

---

### ⚙️ Stack Tecnológico

- Frontend: HTML, CSS, JS  
- Backend: Node.js / PHP  
- BD: MySQL o PostgreSQL  
- Integraciones: GitHub, Google Drive  

---

## 🚀 4. Diagrama de Despliegue UML (Descripción)

### Nodos:

- 💻 Cliente (Navegador)
- 🌐 Servidor Web
- ⚙️ Servidor Backend
- 🗄️ Servidor Base de Datos

### Flujo:

Cliente → Servidor Web → Backend → Base de Datos  

---

## 🎨 5. Mockups (Descripción)

### 🖥️ Pantallas principales:

1. Login  
2. Dashboard  
3. Gestión de Proyectos  
4. Tareas  
5. Entregables  
6. Mensajes  
7. Perfil de Usuario  

---

## 🧭 6. Mapa de Navegación