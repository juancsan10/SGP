# 📄 Documento Informativo: Análisis de Requisitos para el Sistema de Gestión de Proyectos SENA  
**Versión:** V 002
**Fuente:** Resumen elaborado a partir de entrevistas con instructores y aprendices.  
**Propósito:** Servir como documento base para la definición de requisitos funcionales y técnicos del sistema.  

---

## 🧭 Resumen Ejecutivo

El análisis de las entrevistas revela una necesidad crítica y compartida entre **instructores** y **aprendices** por un **sistema digital centralizado** que permita optimizar el seguimiento, la comunicación y la gestión integral de los proyectos académicos en el SENA.  

El principal problema identificado es la **falta de agilidad y visibilidad en tiempo real del progreso de los proyectos**, lo que genera dificultades en la supervisión docente y en la coordinación entre los miembros del equipo.  

Las funcionalidades clave identificadas para una **versión inicial (MVP)** son:

- 📊 **Visualización del porcentaje de avance**  
- 📅 **Gestión de fechas de entrega**  
- 📦 **Definición clara de entregables**  
- 💬 **Comunicación directa entre aprendices e instructores**  
- 🧭 **Dashboard de seguimiento y trazabilidad de tareas**

El sistema es percibido como una **solución estratégica** que aportará **eficiencia, orden, transparencia y una comunicación más fluida** entre todos los actores del proceso formativo.

---

## 1️⃣ Problema Central: Brecha en el Seguimiento de Proyectos

La deficiencia más significativa identificada en el proceso actual es la **falta de herramientas dinámicas que permitan conocer el estado real de los proyectos en tiempo real**.  
Esta brecha impide una supervisión efectiva y retrasa la toma de decisiones pedagógicas oportunas.

> 💬 “El principal problema en este momento es la agilidad con la que los instructores podemos saber el progreso real de los aprendices en el tema de sus proyectos.”  
> — Instructor entrevistado

### Impacto actual:
- Supervisión manual y desactualizada.  
- Pérdida de trazabilidad del avance del proyecto.  
- Descoordinación entre equipos y falta de retroalimentación oportuna.

---

## 2️⃣ Perspectiva y Requisitos del Instructor

El rol del instructor requiere **herramientas analíticas y visuales** que permitan evaluar de forma rápida el estado de múltiples proyectos, sin depender de reportes manuales o documentos dispersos.

### 🔹 2.1. Funcionalidades Mínimas Indispensables (MVP)

| Funcionalidad | Descripción |
|----------------|-------------|
| 📈 **Medición de Progreso** | Mostrar el porcentaje de avance en tiempo real y por fases del proyecto. |
| ⏰ **Gestión de Plazos** | Establecer fechas de entrega y recibir alertas automáticas por retrasos. |
| 📋 **Definición de Entregables** | Asociar entregables a cada etapa con indicadores de cumplimiento. |

### 🔹 2.2. Herramientas y Visualización Sugeridas

Los instructores priorizan interfaces **gráficas, claras e interactivas**, que sustituyan los formatos tabulares estáticos.

- 🗓️ **Calendario Académico Integrado:** Visualización de actividades, entregas y revisiones.  
- 📊 **Dashboard Gráfico:** Módulo central con indicadores de avance, tareas pendientes y alertas.  
- 📬 **Notificaciones Automatizadas:** Recordatorios y seguimiento de entregas próximas.

---

## 3️⃣ Perspectiva y Necesidades del Aprendiz

Desde la óptica de los aprendices, el sistema debe ser una **herramienta de apoyo colaborativo** que facilite la gestión de tareas, el trabajo en equipo y la comunicación con el instructor.

### 🔹 3.1. Necesidades Fundamentales

| Necesidad | Descripción |
|------------|-------------|
| ⚙️ **Eficiencia y Asistencia** | Mayor soporte y seguimiento continuo del docente. |
| 👀 **Visibilidad Compartida** | Todos los integrantes deben ver el avance y responsabilidades del equipo. |
| 🤝 **Coordinación de Equipo** | Evitar duplicidad o ausencia de tareas mediante asignación clara de roles. |

> 💬 “Cada uno hace lo que quiere y a veces se descoordina uno en la misión que tiene.”  
> — Aprendiz entrevistado

### 🔹 3.2. Funcionalidades y Herramientas Deseadas

| Característica | Descripción |
|-----------------|-------------|
| 💬 **Comunicación Directa** | Chat interno tipo “WhatsApp” para interacción entre estudiantes e instructor. |
| 🧾 **Asignación de Tareas** | Panel para distribuir tareas específicas entre los miembros del equipo. |
| ⏳ **Trazabilidad y Cronograma** | Línea de tiempo interactiva para visualizar hitos y avances. |
| 💻 **Entorno de Desarrollo Integrado** | Espacio para subir ejecutables o enlaces a repositorios del proyecto. |

---

## 4️⃣ Consideraciones Técnicas y de Implementación

El diseño técnico debe garantizar **usabilidad, rendimiento y compatibilidad con herramientas TIC ya utilizadas** por la comunidad educativa.

### 🔹 4.1. Objetivos Técnicos

| Objetivo | Propósito |
|-----------|------------|
| 💬 **Comunicación instantánea y centralizada** | Evitar descoordinación y pérdida de información. |
| ⏱️ **Gestión eficiente del tiempo y entregas** | Controlar cronogramas y prioridades desde una sola interfaz. |
| 🧩 **Integración del desarrollo técnico** | Permitir que el código, los entregables y la documentación convivan en el mismo entorno. |

### 🔹 4.2. Diseño de Base de Datos

La base de datos debe vincular **usuarios, roles, proyectos y entregables** con una estructura flexible y escalable:

- 🔹 Facilidad de uso y mantenimiento.  
- ⚡ Rendimiento óptimo en consultas concurrentes.  
- 🧠 Soporte para trazabilidad, edición y control de versiones.

### 🔹 4.3. Herramientas TIC Complementarias

| Herramienta | Propósito de Integración |
|--------------|--------------------------|
| 🐙 **GitHub** | Control de versiones del código fuente y repositorios del proyecto. |
| 📊 **Microsoft Excel / Google Sheets** | Exportación y análisis de datos. |
| ☁️ **Google Drive** | Almacenamiento de entregables y documentación compartida. |
| 📧 **Correo Institucional / Notificaciones Push** | Comunicación formal y avisos automáticos. |

---

## 5️⃣ Beneficios Anticipados y Validación del Concepto

El proyecto es valorado positivamente tanto por instructores como por aprendices. Existe consenso sobre su potencial para **modernizar la gestión académica** y **reducir tiempos administrativos**.

| Beneficio | Descripción |
|------------|-------------|
| 🤝 **Colaboración mejorada** | Fomenta el trabajo en equipo y la construcción conjunta de conocimiento. |
| 🧑‍🏫 **Interacción directa con instructores** | Canal de comunicación constante y bidireccional. |
| ⚡ **Agilidad en la retroalimentación** | Las entregas y correcciones se realizan de forma digital e inmediata. |
| 🧩 **Centralización del proceso académico** | Unifica comunicación, gestión y evaluación en una sola plataforma. |

> 💬 “Varios profesores necesitamos esto para tener un buen ordenamiento de proyectos.”  
> — Testimonio de validación

---

## 🧠 Conclusión General

El **Sistema de Gestión de Proyectos SENA** representa una **solución integral** para optimizar los procesos de planeación, seguimiento y evaluación de proyectos formativos.  
La adopción de esta herramienta no solo mejorará la eficiencia operativa, sino que **fortalecerá la autonomía, la colaboración y la transparencia educativa** dentro del ecosistema SENA.  

El análisis de requisitos permite definir un **primer alcance funcional (MVP)** centrado en el seguimiento, la comunicación y la trazabilidad de proyectos, estableciendo las bases para futuras expansiones con módulos de evaluación, estadísticas y reportes automatizados.

---

> ✍️ **Autor:** Equipo de Análisis de Requisitos – Centro de Formación SENA  
> 📅 **Fecha de elaboración:** 2025-11-12  
> 🧩 **Documento informativo** – No representa aún especificaciones funcionales finales.