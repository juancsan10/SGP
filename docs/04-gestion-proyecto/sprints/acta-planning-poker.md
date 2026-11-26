# Acta de Sesión de Planning Poker — Historias HU-13 a HU-35

**Fecha:** 2 de octubre de 2026  
**Hora:** 14:00 - 15:15 (Duración: 1h 15m)  
**Modalidad:** Videollamada (Discord / Google Meet)  
**Asistentes:**
- Rubiel Rodríguez (@Rubloxil) — Líder técnico y Backend
- Juan Manuel Arcila (@JuanArcila1) — Frontend y Coordinación
- Juan Carlos Sánchez (@juancsan10) — Calidad, Pruebas y QA

---

## 1. Objetivo y Reglas de la Sesión

1. **Objetivo:** Estimar el esfuerzo relativo de las historias de usuario funcionales HU-13 a HU-35 para la planificación de los Sprints 3, 4, 5 y 6 del SGP SENA.
2. **Escala:** Secuencia de Fibonacci modificada: **1, 2, 3, 5, 8, 13**.
3. **Historia de Referencia (Ancla = 3 puntos):** **HU-21** (*Ver el estado actual del proyecto*), que comprende una consulta en backend, un endpoint REST y una vista básica en React con pruebas asociadas.
4. **Criterio de Consenso:**
   - Si todos votan igual, se adopta de inmediato el puntaje.
   - Si la diferencia es de un paso en la secuencia (ej. 3 vs 5), se debate brevemente y se asume el consenso razonado.
   - Si la diferencia es $\ge 2$ pasos (ej. 3 vs 8, o 5 vs 13), el voto más alto y el más bajo sustentan sus razones técnicas y se repite la votación hasta alcanzar acuerdo.

---

## 2. Registro de Votaciones y Consenso

| HU | Título de la Historia | Voto Rubiel | Voto Juan Manuel | Voto Juan Carlos | Consenso | Sprint | Responsable Asignado | Notas de discrepancia y justificación |
|---|---|---|---|---|---|---|---|---|
| **HU-13** | Registro de usuarios | 3 | 3 | 5 | **3** | 3 | Juan Manuel Arcila | Juan Carlos votó 5 por validaciones de formato de documento y correo único. Rubiel y Juan Manuel mostraron que con `express-validator` y restricciones `UNIQUE` en MySQL el esfuerzo es estándar. |
| **HU-14** | Inicio de sesión seguro (JWT, bcrypt, rate limit) | 5 | 5 | 8 | **5** | 3 | Rubiel Rodríguez | Juan Carlos votó 8 por el rate limiting y configuración de tokens JWT. Rubiel mostró que `express-rate-limit` y la firma JWT en middleware centralizado acotan la complejidad a 5 puntos. |
| **HU-15** | Acceso diferenciado por rol | 5 | 3 | 5 | **5** | 3 | Rubiel Rodríguez | Juan Manuel votó 3 pensando solo en proteger rutas en React. Rubiel y Juan Carlos recordaron que requiere middlewares por rol (`auth.middleware.js`) en cada endpoint del backend. |
| **HU-16** | Recuperación de contraseña (código 6 dígitos) | 8 | 8 | 5 | **8** | 5 | Juan Carlos Sánchez | Juan Carlos votó 5 pensando en un endpoint directo con email. Rubiel y Juan Manuel argumentaron que el estándar de seguridad exige 3 pasos (`request`, `verify`, `confirm`), hash HMAC, expiración y límite de reintentos. |
| **HU-17** | Crear proyecto | 5 | 5 | 5 | **5** | 4 | Rubiel Rodríguez | Unanimidad (5). Implica validaciones de negocio: fechas coherentes, asignación obligatoria de instructor y estado inicial 'Propuesta'. |
| **HU-18** | Asignar aprendices al equipo | 5 | 5 | 3 | **5** | 4 | Juan Manuel Arcila | Juan Carlos votó 3 por ser inserción en tabla intermedia. Juan Manuel y Rubiel señalaron las reglas de negocio (máximo 2 proyectos activos por aprendiz y validación de programa). |
| **HU-19** | Definir entregables por fase | 5 | 3 | 5 | **5** | 4 | Juan Carlos Sánchez | Juan Manuel votó 3. Rubiel y Juan Carlos sustentaron que los entregables dependen de las fases del ciclo SENA y requieren validaciones de orden temporal y ponderación. |
| **HU-20** | Historial de cambios del proyecto | 3 | 3 | 5 | **3** | 4 | Rubiel Rodríguez | Juan Carlos votó 5 por considerar triggers o auditoría compleja. Rubiel aclaró que se registra en la capa de servicio con inserciones parametrizadas y consulta paginada. |
| **HU-21** | Ver el estado actual del proyecto (Ancla) | 3 | 3 | 3 | **3** | 4 | Juan Manuel Arcila | Unanimidad (3). Historia ancla de referencia para toda la sesión. |
| **HU-22** | Ver el porcentaje de avance | 3 | 3 | 3 | **3** | 4 | Juan Carlos Sánchez | Unanimidad (3). Consulta de agregación SQL sobre entregables aprobados y cálculo aritmético en frontend/backend. |
| **HU-23** | Comentar el avance de un entregable | 3 | 2 | 3 | **3** | 4 | Juan Manuel Arcila | Juan Manuel consideró 2 por ser un formulario simple. Se acordó 3 puntos para incluir autoría, fecha, validación de permisos en el proyecto y pruebas unitarias. |
| **HU-24** | Calificar un entregable | 5 | 5 | 5 | **5** | 4 | Rubiel Rodríguez | Unanimidad (5). Solo instructor califica; actualiza el estado del entregable, dispara recálculo de avance del proyecto y registra observaciones. |
| **HU-25** | Alertas de entregas próximas o vencidas | 5 | 5 | 8 | **5** | 5 | Juan Carlos Sánchez | Juan Carlos votó 8 anticipando configuración de cron jobs en el sistema operativo. Rubiel propuso servicio en Node con intervalos controlados y consultas de fechas. Consenso en 5. |
| **HU-26** | Mensajes dentro del proyecto | 5 | 5 | 3 | **5** | 5 | Juan Manuel Arcila | Juan Carlos votó 3. Juan Manuel y Rubiel sustentaron que el chat requiere persistencia, validación de integrantes autorizados, formato de texto y soporte para respuestas/avisos. |
| **HU-27** | Comentar en fase o entregable | 3 | 3 | 2 | **3** | 5 | Juan Manuel Arcila | Comparte infraestructura con HU-23, adaptando el contexto al entregable o fase específica. Consenso en 3 puntos. |
| **HU-28** | Notificaciones en tiempo real (WebSocket + SSE) | 8 | 5 | 8 | **8** | 5 | Rubiel Rodríguez | Juan Manuel votó 5 pensando solo en el cliente web. Rubiel y Juan Carlos justificaron 8 puntos por la arquitectura dual: servidor WebSocket nativo con fallback a Server-Sent Events (SSE) y reconexión automática. |
| **HU-29** | Asignar tareas a un integrante | 5 | 5 | 5 | **5** | 4 | Juan Carlos Sánchez | Unanimidad (5). Asignación vinculada a entregable y miembro verificado del equipo del proyecto. |
| **HU-30** | Actualizar el estado de una tarea | 5 | 5 | 5 | **5** | 4 | Juan Manuel Arcila | Unanimidad (5). Máquina de estados (Pendiente $\rightarrow$ En Progreso $\rightarrow$ Completada), validación de permisos del aprendiz asignado. |
| **HU-31** | Programar reuniones | 5 | 5 | 5 | **5** | 5 | Rubiel Rodríguez | Unanimidad (5). Formulario de agendamiento, validación de enlace virtual, fecha futura y notificación a los integrantes del equipo. |
| **HU-32** | Línea de tiempo del proyecto | 5 | 8 | 5 | **5** | 5 | Juan Carlos Sánchez | Juan Manuel votó 8 por la complejidad del componente visual en React. Rubiel y Juan Carlos sugirieron usar componentes de timeline existentes ordenando hitos por fecha. Consenso en 5. |
| **HU-33** | Vincular cuenta de GitHub | 8 | 8 | 13 | **8** | 6 | Rubiel Rodríguez | Juan Carlos votó 13 por OAuth completo y permisos de repositorios. Se acotó a 8 puntos usando personal access tokens / API REST de GitHub con verificación de commits y ramas para el MVP. |
| **HU-34** | Adjuntar archivos a un entregable | 5 | 5 | 5 | **5** | 6 | Juan Manuel Arcila | Unanimidad (5). Manejo multipart con Multer, validación de tipos MIME, tamaño máximo y persistencia en volumen local dockerizado. |
| **HU-35** | Exportar reportes del proyecto | 8 | 8 | 8 | **8** | 6 | Juan Carlos Sánchez | Unanimidad (8). Generación de reportes PDF y hojas de cálculo con datos consolidados de entregables, calificaciones y avance general. |

---

## 3. Resumen y Conclusiones del Acta

- **Total de historias estimadas:** 23 historias (HU-13 a HU-35).
- **Puntos totales de historia:** **115 puntos**.
- **Distribución por Sprint acordada:**
  - **Sprint 3 (Acceso seguro):** HU-13, HU-14, HU-15 $\rightarrow$ **13 puntos**.
  - **Sprint 4 (Núcleo de seguimiento):** HU-17, HU-18, HU-19, HU-20, HU-21, HU-22, HU-23, HU-24, HU-29, HU-30 $\rightarrow$ **42 puntos**.
  - **Sprint 5 (Colaboración y avisos):** HU-16, HU-25, HU-26, HU-27, HU-28, HU-31, HU-32 $\rightarrow$ **39 puntos**.
  - **Sprint 6 (Integraciones y reportes):** HU-33, HU-34, HU-35 $\rightarrow$ **21 puntos**.
- **Observación de velocidad:** Los Sprints 4 y 5 superan la velocidad teórica de 20 puntos por sprint; se acordó en el equipo dividir las historias en tareas incrementales y apoyarse en la rotación de pruebas unitarias para no comprometer la calidad.

Firma de conformidad de los integrantes:
- **Rubiel Rodríguez** (@Rubloxil)
- **Juan Manuel Arcila** (@JuanArcila1)
- **Juan Carlos Sánchez** (@juancsan10)
