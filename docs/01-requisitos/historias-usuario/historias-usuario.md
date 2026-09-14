# 📗 Historias de Usuario — Sistema de Gestión de Proyectos SENA

## 📘 Contexto

Este documento complementa [`../rf-rnf/requisitos-funcionales-no-funcionales.md`](../rf-rnf/requisitos-funcionales-no-funcionales.md),
[`../reglas-negocio/reglas-de-negocio.md`](../reglas-negocio/reglas-de-negocio.md) y
[`../casos-de-uso/casos-de-uso.md`](../casos-de-uso/casos-de-uso.md).

> ℹ️ **Nota de numeración:** los sprints (`../../04-gestion-proyecto/sprints/`)
> ya usan `HU-01` a `HU-12` para historias de trabajo interno del equipo
> (ej. "documentar RF y RNF"). Estas son historias de **usuario final**
> (aprendiz/instructor/admin usando el sistema), así que continúan desde
> `HU-13` — la misma numeración que usa el tablero de GitHub Projects del
> equipo, para que ambos se puedan cruzar directamente.

**Leyenda de estado** (verificado contra el código real, no aspiracional):
✅ Hecho y verificado · 🟡 Parcial (funciona, con una limitación conocida) · ⬜ Pendiente

---

## 🔹 Épica 1: Gestión de Usuarios (RF1)

### HU-13 — Registro de usuarios
**Como** administrador del sistema
**Quiero** registrar instructores y aprendices con su rol correspondiente
**Para** que cada uno acceda únicamente a las funciones que le corresponden

**Requisito relacionado:** RF1.1 / RN-008 · **Endpoint:** `POST /auth/register`
**Estado:** ✅ Hecho

---

### HU-14 — Inicio de sesión seguro
**Como** aprendiz o instructor
**Quiero** iniciar sesión con mi correo y contraseña
**Para** acceder de forma segura a mi panel de proyectos

**Requisito relacionado:** RF1.2, RNF3.1 / RN-006 · **Caso de uso:** CU-001 · **Endpoint:** `POST /auth/login`
**Estado:** ✅ Hecho (JWT + bcrypt + rate limiting contra fuerza bruta)

---

### HU-15 — Acceso diferenciado por rol
**Como** administrador del sistema
**Quiero** que cada endpoint valide el rol del usuario autenticado
**Para** que un aprendiz no pueda ejecutar acciones exclusivas de instructor o administrador

**Requisito relacionado:** RF1.3, RNF3.3 / RN-005, RN-025 · **Endpoint:** `GET/PUT/DELETE /usuarios`, `POST /auth/users`
**Estado:** ✅ Hecho — verificado en vivo: bypass de Admin, Instructor limitado a proyectos propios, Aprendiz sin acceso a gestión de usuarios

---

### HU-16 — Recuperación de contraseña
**Como** usuario que olvidó su contraseña
**Quiero** poder restablecerla de forma segura
**Para** no quedar bloqueado fuera del sistema

**Requisito relacionado:** RF1.4 · **Endpoint:** `POST /auth/password-reset/request`, `/confirm`
**Estado:** ✅ Hecho — tabla `password_reset_tokens`, enlace de un solo uso, página `ResetPasswordPage.jsx`

---

## 🔹 Épica 2: Gestión de Proyectos (RF2)

### HU-17 — Crear proyecto
**Como** instructor
**Quiero** crear un proyecto con nombre, descripción y fecha de inicio
**Para** comenzar a organizar el trabajo formativo de mi grupo

**Requisito relacionado:** RF2.1 / RN-004, RN-011 · **Caso de uso:** CU-002 · **Endpoint:** `POST /proyectos`
**Estado:** ✅ Hecho

---

### HU-18 — Asignar aprendices al equipo del proyecto
**Como** instructor
**Quiero** agregar o quitar aprendices de un proyecto
**Para** mantener actualizado el equipo real que lo está desarrollando

**Requisito relacionado:** RF2.2 / RN-001 · **Caso de uso:** CU-003 · **Endpoint:** `POST/GET /equipos`
**Estado:** ✅ Hecho — valida que solo se agreguen Aprendices y respeta el límite de 2 proyectos activos por aprendiz (RN-001)

---

### HU-19 — Definir entregables por fase
**Como** instructor
**Quiero** registrar entregables con fecha límite dentro de cada fase del proyecto
**Para** que el equipo sepa exactamente qué debe entregar y cuándo

**Requisito relacionado:** RF2.3 / RN-019 · **Caso de uso:** CU-007 · **Endpoint:** `POST/GET /entregables`
**Estado:** ✅ Hecho — valida coherencia de fechas contra el rango de la fase padre

---

### HU-20 — Historial de cambios del proyecto
**Como** instructor o administrador
**Quiero** ver un historial de qué se modificó, cuándo y quién lo hizo
**Para** tener trazabilidad completa del proyecto

**Requisito relacionado:** RF2.4, RF3.2 / RN-026 · **Endpoint:** `GET /historial`
**Estado:** ✅ Hecho — todos los controladores registran cambios automáticamente

---

### HU-21 — Ver el estado actual del proyecto
**Como** aprendiz o instructor
**Quiero** ver si un proyecto está "en planificación", "activo", "en revisión" o "finalizado"
**Para** saber en qué etapa se encuentra sin tener que preguntar

**Requisito relacionado:** RF2.5 / RN-013, RN-014 · **Caso de uso:** CU-011 · **Endpoint:** `GET /proyectos/:id`
**Estado:** ✅ Hecho

---

## 🔹 Épica 3: Seguimiento y Evaluación (RF3)

### HU-22 — Ver el porcentaje de avance
**Como** aprendiz o instructor
**Quiero** ver el porcentaje de avance del proyecto de forma visual
**Para** entender rápidamente qué tan cerca está de completarse

**Requisito relacionado:** RF3.1 · **Endpoint:** campo `porcentaje_avance` en proyectos/fases/tareas + `GET /agenda/:id_proyecto/calendario`
**Estado:** ✅ Hecho

---

### HU-23 — Comentar el avance de un entregable
**Como** instructor o aprendiz
**Quiero** dejar comentarios de retroalimentación sobre un entregable
**Para** guiar al equipo sin esperar a la evaluación final

**Requisito relacionado:** RF3.3, RF4.2 / RN-015 · **Caso de uso:** CU-005 (parcial) · **Endpoint:** `POST/GET /comentarios`
**Estado:** ✅ Hecho — probado en vivo (login real + petición HTTP real)

---

### HU-24 — Calificar un entregable
**Como** instructor
**Quiero** asignar una calificación numérica a un entregable
**Para** dejar constancia formal de la evaluación del avance

**Criterios de aceptación:**
- Solo se puede calificar si el proyecto está en estado "En Revisión" (RN-016).
- La calificación debe estar entre 0 y 100 (RN-013).

**Requisito relacionado:** RF3.3 / RN-013, RN-016 · **Caso de uso:** CU-005 · **Endpoint:** `POST/GET/PUT /evaluaciones`
**Estado:** ✅ Hecho — probado en ambos sentidos: rechaza (400) si el proyecto no está en revisión, acepta (201) si sí lo está

---

### HU-25 — Recibir alertas de entregas próximas o vencidas
**Como** aprendiz
**Quiero** recibir una notificación cuando un entregable esté por vencer
**Para** no perder la fecha límite

**Requisito relacionado:** RF3.4 / RN-023 · **Caso de uso:** CU-009 (parcial) · **Endpoint:** `alerts.service.js` + `GET /notificaciones`
**Estado:** ✅ Hecho — confirmado corriendo automáticamente cada hora (`setInterval` en `server.js`)

---

## 🔹 Épica 4: Comunicación y Colaboración (RF4)

### HU-26 — Enviar mensajes dentro del proyecto
**Como** miembro de un equipo de proyecto
**Quiero** enviar y leer mensajes dentro del canal del proyecto
**Para** coordinarme con mis compañeros e instructor sin salir del sistema

**Requisito relacionado:** RF4.1, RF4.3 · **Caso de uso:** CU-008 · **Endpoint:** `POST/GET /mensajes`
**Estado:** ✅ Hecho — sin tiempo real (ver HU-28)

---

### HU-27 — Comentar dentro de una fase o entregable
**Como** instructor o aprendiz
**Quiero** dejar comentarios puntuales sobre un entregable específico
**Para** que la retroalimentación quede asociada al elemento correcto

**Requisito relacionado:** RF4.2 / RN-015 · **Endpoint:** mismo endpoint que HU-23 (`/comentarios`)
**Estado:** ✅ Hecho

---

### HU-28 — Notificaciones en tiempo real
**Como** usuario del sistema
**Quiero** ver notificaciones nuevas sin recargar la página
**Para** enterarme al instante de mensajes o asignaciones nuevas

**Requisito relacionado:** RF4.4 / RN-021 · **Caso de uso:** CU-009
**Estado:** ⬜ Pendiente — las notificaciones se generan y guardan correctamente (RN-021), pero requiere recargar; falta WebSocket o polling automático (documentado en `docs/07-deuda-tecnica.md`)

---

## 🔹 Épica 5: Gestión de Tareas y Cronograma (RF5)

### HU-29 — Asignar tareas a un integrante
**Como** instructor
**Quiero** asignar una tarea específica a un aprendiz del equipo
**Para** distribuir el trabajo de forma clara

**Requisito relacionado:** RF5.1 / RN-017 · **Caso de uso:** CU-006 · **Endpoint:** `POST /tareas`
**Estado:** ✅ Hecho

---

### HU-30 — Actualizar el estado de una tarea
**Como** aprendiz
**Quiero** marcar mis tareas como "en curso" o "completada", y registrar mi entrega
**Para** que el equipo vea mi progreso real

**Requisito relacionado:** RF5.2 · **Caso de uso:** CU-006 · **Endpoint:** `PUT /tareas/:id`, `POST /entregas/tarea/:id` (+ `/upload`)
**Estado:** ✅ Hecho — incluye el flujo completo de entrega/corrección (Entregada → Requiere corrección → Corregida → Aprobada)

---

### HU-31 — Programar reuniones del proyecto
**Como** instructor
**Quiero** programar una reunión con fecha, hora y lugar
**Para** coordinar seguimientos con el equipo, y que se notifique automáticamente

**Requisito relacionado:** RF5.3 / RN-021 · **Endpoint:** `POST/GET /reuniones`
**Estado:** ✅ Hecho — notifica a todo el equipo del proyecto automáticamente al programarse

---

### HU-32 — Ver la línea de tiempo del proyecto
**Como** aprendiz o instructor
**Quiero** visualizar cronológicamente las fases, entregas y reuniones
**Para** entender de un vistazo el avance temporal del proyecto

**Requisito relacionado:** RF5.3, RF5.4 · **Endpoint:** `GET /agenda/:id_proyecto/timeline`, `/calendario`
**Estado:** ✅ Hecho — `agenda.controller.js` + páginas `TimelinePage.jsx` y `CalendarioPage.jsx`

---

## 🔹 Épica 6: Integración y Almacenamiento (RF6)

### HU-33 — Vincular mi cuenta de GitHub
**Como** aprendiz o instructor
**Quiero** vincular mi usuario y token de GitHub a mi perfil, y consultar los repositorios del proyecto
**Para** que el sistema muestre mi actividad de código

**Requisito relacionado:** RF6.1 · **Endpoint:** `POST/GET/PUT/DELETE /github-integration`, `POST/GET /repositorios`
**Estado:** 🟡 Parcial — el CRUD funciona y el token nunca se expone en las respuestas; falta consumir la API real de GitHub (listar commits/ramas)

---

### HU-34 — Adjuntar archivos a un entregable
**Como** aprendiz
**Quiero** adjuntar el archivo de mi entregable
**Para** que el instructor pueda revisarlo

**Requisito relacionado:** RF6.2 · **Caso de uso:** CU-007 (parcial) · **Endpoint:** `POST /archivos/upload/:id`, `POST /entregas/tarea/:id/upload`
**Estado:** 🟡 Parcial — la subida real de archivos ya funciona (multer + volumen persistente), pero es almacenamiento **local**, no una integración con un proveedor cloud (Drive/S3) como pedía el requisito original

---

### HU-35 — Exportar reportes del proyecto
**Como** instructor
**Quiero** exportar un reporte del avance del proyecto en PDF o Excel
**Para** compartirlo o archivarlo fuera del sistema

**Requisito relacionado:** RF6.3 · **Caso de uso:** CU-010
**Estado:** ⬜ Pendiente — sin código todavía

---

## 📊 Resumen de cobertura

| Estado | Cantidad | Historias |
|---|---|---|
| ✅ Hecho | 18 | HU-13 a HU-27, HU-29, HU-30, HU-31, HU-32 |
| 🟡 Parcial | 2 | HU-33, HU-34 |
| ⬜ Pendiente | 2 | HU-28, HU-35 |

**18 de 23 historias completamente implementadas y verificadas (≈78%)**, 2 parciales
con una limitación puntual documentada, y 2 sin iniciar por decisión del equipo
(no por olvido) — ver `docs/07-deuda-tecnica.md`.

> ✍️ **Autor:** Equipo de Desarrollo — Sistema de Gestión de Proyectos SENA
> 📅 **Última actualización:** ver historial de commits de este archivo
