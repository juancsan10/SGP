# 💼 Casos de Uso - Sistema de Gestión de Proyectos SENA

---

## 👥 1. Identificación de Actores

### 🎯 Actores Principales
- 👨‍🎓 **Aprendiz:** Desarrolla proyectos formativos y registra avances  
- 👨‍🏫 **Instructor:** Supervisa, evalúa y retroalimenta proyectos  

### ⚙️ Actores Secundarios
- 💻 **Sistema:** Ejecuta validaciones, notificaciones y procesos automáticos  

---

## 🧩 2. Casos de Uso del Sistema

---

## 🔐 CU-001: Iniciar Sesión

**Actor:** Aprendiz / Instructor  

**Descripción:** Permite el acceso al sistema mediante credenciales válidas  

### ✅ Precondiciones
- Usuario registrado  
- Sistema disponible  

### 🧭 Flujo Principal
1. El usuario accede al sistema  
2. Ingresa credenciales  
3. El sistema valida información  
4. Acceso concedido  

### ⚠️ Flujo Alternativo
- Credenciales incorrectas → mensaje de error  

### 📄 Postcondición
- Usuario autenticado  

### 🔗 Requisitos Relacionados
RF1.2, RNF3.1  

---

## 🆕 CU-002: Crear Proyecto

**Actor:** Aprendiz  

**Descripción:** Permite crear un nuevo proyecto  

### ✅ Precondiciones
- Usuario autenticado  
- No exceder límite de proyectos (RN-001)  

### 🧭 Flujo Principal
1. Accede a módulo de proyectos  
2. Selecciona "Crear Proyecto"  
3. Ingresa datos  
4. Sistema valida  
5. Sistema guarda proyecto  

### ⚠️ Flujo Alternativo
- Campos incompletos → error  

### 📄 Postcondición
- Proyecto creado en estado "En Planificación"  

### 🔗 Requisitos Relacionados
RF2.1, RN-001  

---

## 🧑‍🏫 CU-003: Asignar Instructor a Proyecto

**Actor:** Instructor  

### 🧭 Flujo Principal
1. Visualiza proyectos disponibles  
2. Selecciona proyecto  
3. Se asigna como instructor  
4. Sistema actualiza  

### 📄 Postcondición
- Proyecto con instructor asignado  

### 🔗 Requisitos Relacionados
RF2.2, RN-002  

---

## 📈 CU-004: Registrar Avance

**Actor:** Aprendiz  

### 🧭 Flujo Principal
1. Selecciona proyecto  
2. Ingresa avance  
3. Sistema valida porcentaje  
4. Guarda avance  

### ⚠️ Validación
- Debe registrarse mínimo semanalmente (RN-003)  

### 📄 Postcondición
- Avance registrado  

### 🔗 Requisitos Relacionados
RF3.1, RF3.2, RN-003  

---

## 🧾 CU-005: Evaluar Proyecto

**Actor:** Instructor  

### 🧭 Flujo Principal
1. Accede al proyecto  
2. Revisa avances  
3. Agrega retroalimentación  
4. Cambia estado  

### 📄 Postcondición
- Proyecto actualizado  

### 🔗 Requisitos Relacionados
RF3.3  

---

## 📋 CU-006: Gestionar Tareas

**Actor:** Instructor / Aprendiz  

### 🧭 Flujo Principal
1. Crear tarea  
2. Asignar responsable  
3. Actualizar estado  

### 📄 Postcondición
- Tarea registrada  

### 🔗 Requisitos Relacionados
RF5.1, RF5.2  

---

## 📦 CU-007: Gestionar Entregables

**Actor:** Aprendiz  

### 🧭 Flujo Principal
1. Subir archivo  
2. Asociar a fase  
3. Registrar versión  

### 📄 Postcondición
- Entregable almacenado  

### 🔗 Requisitos Relacionados
RF2.3, RF6.2  

---

## 💬 CU-008: Enviar Mensajes

**Actor:** Aprendiz / Instructor  

### 🧭 Flujo Principal
1. Accede al chat  
2. Escribe mensaje  
3. Sistema envía  

### 📄 Postcondición
- Mensaje almacenado  

### 🔗 Requisitos Relacionados
RF4.1  

---

## 🔔 CU-009: Recibir Notificaciones

**Actor:** Sistema  

### 🧭 Flujo Principal
1. Detecta evento  
2. Genera notificación  
3. Envía al usuario  

### 📄 Postcondición
- Usuario notificado  

### 🔗 Requisitos Relacionados
RF3.4, RF4.4  

---

## 📊 CU-010: Generar Reportes

**Actor:** Instructor  

### 🧭 Flujo Principal
1. Selecciona tipo de reporte  
2. Sistema procesa datos  
3. Genera archivo  

### 📄 Postcondición
- Reporte disponible  

### 🔗 Requisitos Relacionados
RF6.3  

---

## 🔍 CU-011: Consultar Proyectos

**Actor:** Aprendiz / Instructor  

### 🧭 Flujo Principal
1. Filtrar proyectos  
2. Visualizar resultados  

### 📄 Postcondición
- Información consultada  

### 🔗 Requisitos Relacionados
RF2.5  

---

## 📊 3. Estados del Proyecto

- 🗂️ En Planificación  
- ⚙️ En Desarrollo  
- 🧮 En Revisión  
- ✅ Finalizado  
- ⏸️ Suspendido  

---

## ⚖️ 4. Reglas de Negocio

- **RN-001:** Máximo 2 proyectos activos por aprendiz  
- **RN-002:** Máximo 10 proyectos por instructor  
- **RN-003:** Avances mínimos semanales  
- **RN-004:** Duración entre 1 y 6 meses  

---

## 🧠 5. Observaciones Finales

- Todos los casos están alineados con los requisitos funcionales  
- Se garantiza trazabilidad entre análisis, diseño y desarrollo  
- El documento cubre completamente el alcance del MVP  

---

**📌 Versión:** 2.0  
**📌 Estado:** Final - Listo para entrega  
**📌 Proyecto:** Sistema de Gestión de Proyectos SENA  