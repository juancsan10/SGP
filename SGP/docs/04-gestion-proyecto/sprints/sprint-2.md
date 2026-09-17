# Sprint 2 – Modelado UML, Arquitectura y Módulos Base
**Fechas:** 2026-02-20 → 2026-05-13  
**Equipo:** Rubiel Rodriguez · Juan Manuel Arcila · Juan Carlos Sanchez

---

## 🎯 Objetivo del Sprint

Completar el modelado UML del sistema (diagrama de clases con herencia, composición y asociación), definir la arquitectura de software en capas, documentar la API REST y construir las pantallas base HTML de los tres roles del sistema.

---

## 📋 Historias Comprometidas

| # | Historia de usuario | Responsable | Estado |
|---|---------------------|-------------|--------|
| HU-06 | Como equipo, necesito el diagrama de clases UML completo para tener una guía clara del modelo orientado a objetos del sistema. | Rubiel (Backend) | ✅ Completada |
| HU-07 | Como equipo, necesito definir la arquitectura de software para establecer cómo se comunican las capas del sistema. | Rubiel (Backend) | ✅ Completada |
| HU-08 | Como equipo, necesito documentar la API REST con todos los endpoints para guiar la integración frontend–backend. | Rubiel (Backend) | ✅ Completada |
| HU-09 | Como aprendiz, quiero un panel de control con mis proyectos, tareas y entregables para consultar mi avance fácilmente. | Juan Manuel (Frontend) | ✅ Completada (HTML base) |
| HU-10 | Como instructor, quiero un panel con los proyectos de mis aprendices y herramientas de retroalimentación para hacer seguimiento. | Juan Manuel (Frontend) | ✅ Completada (HTML base) |
| HU-11 | Como administrador, quiero un panel con KPIs globales del centro de formación para supervisar el estado general. | Juan Manuel (Frontend) | ✅ Completada (HTML base) |
| HU-12 | Como equipo, necesito integrar el frontend HTML al proyecto React/Vite para tener una base de desarrollo unificada. | Juan Manuel (Frontend) | 🟡 Parcial – pendiente para T5 |

---

## 🖥️ Resultado de la Demo

Se presentaron los siguientes entregables al instructor:

- Diagrama de clases UML completo con 11 clases documentadas: `Usuario` (clase base), `Aprendiz` e `Instructor` (herencia), `Proyecto`, `Tarea`, `Entregable`, `FaseProyecto`, `Mensaje`, `Notificacion`, `Repositorio`, `HistorialCambios`. Incluye atributos, métodos, visibilidad y relaciones de herencia/composición.
- Documento de arquitectura de software en capas: Presentación (React), Lógica de Negocio (API REST + JWT), Datos (MySQL). Flujo completo del ciclo de vida de un proyecto documentado.
- API REST documentada con autenticación JWT y endpoints para todos los módulos: `/auth`, `/usuarios`, `/proyectos`, `/equipos`, `/fases`, `/entregables`, `/tareas`, `/mensajes`, `/notificaciones`, `/repositorios`, `/historial`.
- Pantallas HTML funcionales para los tres roles del sistema (Admin, Instructor, Aprendiz) con navegación, KPIs y vistas de gestión.
- Proyecto React/Vite inicializado con estructura base lista para desarrollo.

---

## 🔄 Retrospectiva

### ✅ ¿Qué salió bien?
- El UML quedó muy completo respecto al sprint anterior; se documentó clase por clase con atributos, métodos y relaciones.
- Las pantallas HTML base de los tres roles están funcionales y con buen nivel de detalle (sidebar, KPIs, módulos de gestión).
- La API REST cubre todos los módulos del sistema de forma coherente con el modelo de datos.

### ❌ ¿Qué salió mal?
- Las pantallas HTML base no se integraron al proyecto React/Vite durante el sprint. El `App.jsx` quedó con el template por defecto de Vite.
- No se estableció un tablero de seguimiento activo durante el sprint, lo que dificultó visualizar el estado de cada historia en tiempo real.
- No hubo pruebas unitarias ni de integración realizadas.

### 🚀 Ítem de mejora implementado
**Mejora:** Se separó y organizó la documentación UML por carpetas temáticas (`rol/`, `proyecto/`, `notificaciones/`) dentro de `Docs/---SUSTENTACION/002/`, corrigiendo la versión anterior del archivo `.puml` que estaba incompleto. Cada clase quedó documentada en su propio archivo `.Md` con tabla de atributos y métodos.  
**Evidencia:** Archivos en `Docs/---SUSTENTACION/002/` – commits `done_` y `modifi_details`.
