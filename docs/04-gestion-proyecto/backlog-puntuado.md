# Product Backlog puntuado y planificación por sprints (HU-13 a HU-35)

> **Cómo leer este documento.** Las historias, su estado y su orden salen de `docs/01-requisitos/historias-usuario/historias-usuario.md`. Los **puntos de historia, la prioridad MoSCoW, el sprint y el responsable propuesto** son una **propuesta inicial** calculada con la técnica de abajo; el equipo debe confirmarlos o ajustarlos en una sesión real de *Planning Poker* y dejar el acta en `docs/04-gestion-proyecto/sprints/acta-planning-poker.md` (plantilla incluida al final). No son un registro de una sesión ya realizada.

## 1. Técnica de estimación
Planning Poker con la secuencia de Fibonacci **1, 2, 3, 5, 8, 13**. Referencia (historia ancla = **3 puntos**): HU-21 *Ver el estado actual del proyecto* (una consulta + una vista). Se estima esfuerzo relativo que incluye backend, frontend y pruebas. Velocidad objetivo: ~20 puntos por sprint de 2 semanas con 3 integrantes.

## 2. Backlog

Prioridad MoSCoW: **M** Must · **S** Should · **C** Could. Responsable propuesto = quien lidera; los otros dos revisan (regla de rotación de `docs/matriz-rotacion.md`).

| HU | Historia | Prio | Puntos | Sprint | Responsable propuesto | Estado real |
|---|---|---|---|---|---|---|
| HU-13 | Registro de usuarios | M | 3 | 3 | Juan Manuel Arcila | ✅ Hecho |
| HU-14 | Inicio de sesión seguro (JWT, bcrypt, rate limit) | M | 5 | 3 | Rubiel Rodríguez | ✅ Hecho |
| HU-15 | Acceso diferenciado por rol | M | 5 | 3 | Rubiel Rodríguez | ✅ Hecho |
| HU-16 | Recuperación de contraseña (código 6 dígitos) | S | 8 | 5 | Juan Carlos Sánchez | ✅ Hecho |
| HU-17 | Crear proyecto | M | 5 | 4 | Rubiel Rodríguez | ✅ Hecho |
| HU-18 | Asignar aprendices al equipo | M | 5 | 4 | Juan Manuel Arcila | ✅ Hecho |
| HU-19 | Definir entregables por fase | M | 5 | 4 | Juan Carlos Sánchez | ✅ Hecho |
| HU-20 | Historial de cambios del proyecto | S | 3 | 4 | Rubiel Rodríguez | ✅ Hecho |
| HU-21 | Ver el estado actual del proyecto | M | 3 | 4 | Juan Manuel Arcila | ✅ Hecho |
| HU-22 | Ver el porcentaje de avance | M | 3 | 4 | Juan Carlos Sánchez | ✅ Hecho |
| HU-23 | Comentar el avance de un entregable | S | 3 | 4 | Juan Manuel Arcila | ✅ Hecho |
| HU-24 | Calificar un entregable | M | 5 | 4 | Rubiel Rodríguez | ✅ Hecho |
| HU-25 | Alertas de entregas próximas o vencidas | S | 5 | 5 | Juan Carlos Sánchez | ✅ Hecho |
| HU-26 | Mensajes dentro del proyecto | S | 5 | 5 | Juan Manuel Arcila | ✅ Hecho |
| HU-27 | Comentar en fase o entregable | C | 3 | 5 | Juan Manuel Arcila | ✅ Hecho |
| HU-28 | Notificaciones en tiempo real (WebSocket + SSE) | S | 8 | 5 | Rubiel Rodríguez | ✅ Hecho |
| HU-29 | Asignar tareas a un integrante | M | 5 | 4 | Juan Carlos Sánchez | ✅ Hecho |
| HU-30 | Actualizar el estado de una tarea | M | 5 | 4 | Juan Manuel Arcila | ✅ Hecho |
| HU-31 | Programar reuniones | S | 5 | 5 | Rubiel Rodríguez | ✅ Hecho |
| HU-32 | Línea de tiempo del proyecto | C | 5 | 5 | Juan Carlos Sánchez | ✅ Hecho |
| HU-33 | Vincular cuenta de GitHub | C | 8 | 6 | Rubiel Rodríguez | 🟡 Parcial (falta cifrar token, SEC-06) |
| HU-34 | Adjuntar archivos a un entregable | S | 5 | 6 | Juan Manuel Arcila | 🟡 Parcial (almacenamiento en nube, RF6.2) |
| HU-35 | Exportar reportes del proyecto | S | 8 | 6 | Juan Carlos Sánchez | ⬜ Pendiente |

**Total:** 23 historias · 116 puntos · 20 hechas (≈ 87 %), 2 parciales, 1 pendiente.

## 3. Planificación por sprint (propuesta)

| Sprint | Objetivo | Historias | Puntos |
|---|---|---|---|
| Sprint 3 | Acceso seguro: registro, login y roles | HU-13, 14, 15 | 13 |
| Sprint 4 | Núcleo del seguimiento: proyectos, equipos, fases, entregables, tareas, calificación | HU-17, 18, 19, 20, 21, 22, 23, 24, 29, 30 | 42 |
| Sprint 5 | Colaboración y avisos: mensajes, tiempo real, reuniones, alertas, recuperación | HU-16, 25, 26, 27, 28, 31, 32 | 39 |
| Sprint 6 | Integraciones y reportes (en curso) | HU-33, 34, 35 | 21 |

Los Sprints 1 y 2 (modelado, arquitectura y paneles) están en `sprints/sprint-1.md` y `sprints/sprint-2.md`. Los sprints 4 y 5 superan la velocidad objetivo de 20 puntos: es un hallazgo a discutir en la retrospectiva (se repartieron en varias iteraciones o se subestimó).

## 4. Tareas asignadas (ejemplo de desglose por historia)
Cada historia se desglosa en tareas de capa: `API` (ruta + validación + controlador), `BD` (migración/consulta), `Front` (página/componente), `Test` (unitaria + integración/E2E) y `Docs`. Ejemplo ilustrativo para HU-16 (los responsables son una propuesta; ajústalos a quien realmente lo hizo):

| Tarea | Capa | Responsable | Estado |
|---|---|---|---|
| Endpoints `request/verify/confirm` con hash HMAC y límites | API | Juan Carlos Sánchez | ✅ |
| Tabla de códigos y sesiones de reinicio | BD | Juan Carlos Sánchez | ✅ |
| Pantalla de 3 pasos con reenvío y cuenta regresiva | Front | Juan Manuel Arcila | ✅ |
| Pruebas del flujo (código, intentos, vencimiento) | Test | Rubiel Rodríguez | ✅ |
| Documentar el flujo en `api-rest.md` | Docs | Rubiel Rodríguez | ✅ |

El tablero vivo es el proyecto de GitHub (ver `github-projects/backlog-github-projects.md`); este archivo es la foto documentada.

## 5. Plantilla de acta de Planning Poker
```
Fecha: ____  Sprint: ____  Asistentes: ____
| HU | Voto Rubiel | Voto Juan Manuel | Voto Juan Carlos | Consenso | Notas de discrepancia |
```
Regla: si la diferencia entre votos es ≥ 2 pasos de la secuencia, quien votó más alto y más bajo explican y se vuelve a votar.
