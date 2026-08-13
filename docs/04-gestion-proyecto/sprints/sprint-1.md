# Sprint 1 – Análisis, Diseño y Base de Datos
**Fechas:** 2025-11-19 → 2026-02-20  
**Equipo:** Rubiel Rodriguez · Juan Manuel Arcila · Juan Carlos Sanchez

---

## 🎯 Objetivo del Sprint

Establecer las bases técnicas y conceptuales del sistema: levantar requisitos, definir el modelo de datos, diseñar el modelo entidad-relación y producir el DDL inicial de la base de datos.

---

## 📋 Historias Comprometidas

| # | Historia de usuario | Responsable | Estado |
|---|---------------------|-------------|--------|
| HU-01 | Como equipo, necesito documentar los requisitos funcionales y no funcionales del sistema para tener una base clara de desarrollo. | Juan Carlos (QA) | ✅ Completada |
| HU-02 | Como equipo, necesito diseñar el modelo entidad-relación del sistema para entender las relaciones entre datos. | Rubiel (Backend) | ✅ Completada |
| HU-03 | Como equipo, necesito crear el DDL de la base de datos con todas las tablas y relaciones para poder iniciar el desarrollo. | Rubiel (Backend) | ✅ Completada |
| HU-04 | Como equipo, necesito documentar las reglas de negocio y restricciones del sistema para guiar las decisiones de desarrollo. | Juan Manuel (Frontend) | ✅ Completada |
| HU-05 | Como equipo, necesito identificar los casos de uso principales para definir el alcance del MVP. | Juan Carlos (QA) | ✅ Completada |

---

## 🖥️ Resultado de la Demo

Se presentaron los siguientes entregables al instructor:

- Documento de RF y RNF con 6 módulos funcionales, 26 requisitos funcionales y 15 no funcionales.
- Diagrama Entidad-Relación del sistema con 11 entidades y sus relaciones (`Diagrama ER de sistema de gestión.png`).
- DDL funcional con las tablas: `roles`, `usuarios`, `proyectos`, `equipos_proyecto`, `fases_proyecto`, `entregables`, `tareas`, `mensajes`, `notificaciones`, `repositorios`, `historial_cambios`.
- Documento de reglas de negocio (RN-001 a RN-030).
- Documento de restricciones técnicas, operativas, de seguridad y de alcance.

---

## 🔄 Retrospectiva

### ✅ ¿Qué salió bien?
- Se logró documentar todos los módulos del sistema de forma completa antes del plazo.
- El modelo ER quedó bien estructurado y fue validado por el instructor.
- Buena distribución de roles dentro del equipo (Backend, Frontend/UX, QA).

### ❌ ¿Qué salió mal?
- El DDL inicial solo contenía IDs y llaves foráneas, sin atributos de negocio reales (`nombre`, `estado`, `fecha_inicio`, `porcentaje_avance`), lo que generó retrabajo.
- No se estableció desde el inicio un tablero de seguimiento para visualizar el avance de las tareas.

### 🚀 Ítem de mejora implementado
**Mejora:** Se rehízo el esquema de base de datos completo en `BASE_DE_DATOS_OFICIAL_CON_inserciones.sql`, agregando todos los atributos de negocio faltantes, restricciones `NOT NULL`, campos de auditoría (`fecha_registro`) y datos de prueba con `INSERT INTO` para facilitar el desarrollo.  
**Evidencia:** Commit `corecion de base de datos` – 2026-04-12.
