# 🧭 Matriz de Trazabilidad — SGP SENA

## 📘 Qué es este documento (y qué no es)

Este documento es la **matriz de trazabilidad de requisitos**: conecta cada
Requisito Funcional (RF) con su Regla de Negocio (RN), Caso de Uso (CU),
Historia de Usuario (HU), el **endpoint real que lo implementa**, y su
**estado verificado** (no aspiracional).

⚠️ No confundir con **RF3.2 "Trazabilidad"**, que es un requisito
*funcional del sistema* (el historial de cambios que ve el usuario final,
implementado en la tabla `historial_cambios` y expuesto en
`GET /api/v1/historial`). Esta matriz es un artefacto de *gestión del
proyecto*, para que el equipo (y el evaluador) puedan verificar que cada
requisito documentado realmente se construyó — son dos usos distintos de
la misma palabra.

**Fuentes de esta matriz** (ningún dato se inventó, todo se cruzó contra el
código real en la rama `test` al momento de escribir esto):
- `docs/01-requisitos/rf-rnf/requisitos-funcionales-no-funcionales.md`
- `docs/01-requisitos/reglas-negocio/reglas-de-negocio.md`
- `docs/01-requisitos/casos-de-uso/casos-de-uso.md`
- `docs/01-requisitos/historias-usuario/historias-usuario.md`
- `backend/src/routes/index.js` y cada archivo de rutas individual

**Leyenda de estado:**
✅ Hecho y verificado · 🟡 Parcial (funciona, con una limitación conocida) · ⬜ Pendiente (no implementado)

---

## 1. Requisitos Funcionales (RF) → Implementación

### RF1 — Gestión de Usuarios

| RF | RN | CU | HU | Endpoint(s) reales | Estado |
|---|---|---|---|---|---|
| RF1.1 Registro de usuarios | RN-008 | — | HU-13 | `POST /auth/register` | ✅ |
| RF1.2 Autenticación segura | RN-006, RNF3.1 | CU-001 | HU-14 | `POST /auth/login` (JWT + bcrypt + rate limit) | ✅ |
| RF1.3 Gestión de roles | RN-005, RN-025 | — | HU-15 | `GET/PUT/DELETE /usuarios`, `POST /auth/users` (solo Admin) | ✅ |
| RF1.4 Recuperación de contraseña | — | — | HU-16 | `POST /auth/password-reset/request`, `/verify`, `/confirm` | ✅ |

### RF2 — Gestión de Proyectos

| RF | RN | CU | HU | Endpoint(s) reales | Estado |
|---|---|---|---|---|---|
| RF2.1 Creación de proyectos | RN-004, RN-011 | CU-002 | HU-17 | `POST /proyectos` | ✅ |
| RF2.2 Asignación de integrantes | RN-001 | CU-003 | HU-18 | `POST/GET /equipos` (solo Aprendices, validado) | ✅ |
| RF2.3 Definición de entregables | RN-019 | CU-007 | HU-19 | `POST/GET /entregables`, `/fases` | ✅ |
| RF2.4 Control de versiones (historial) | RN-026 | — | HU-20 | `GET /historial` | ✅ |
| RF2.5 Estado del proyecto | RN-013, RN-014 | CU-011 | HU-21 | `GET /proyectos/:id` | ✅ |

### RF3 — Seguimiento y Evaluación

| RF | RN | CU | HU | Endpoint(s) reales | Estado |
|---|---|---|---|---|---|
| RF3.1 Medición de progreso | — | — | HU-22 / HU-32 | `GET /agenda/:id_proyecto/calendario`, `/timeline` | ✅ |
| RF3.2 Trazabilidad (historial de actividad) | RN-026 | — | HU-20 | `GET /historial` | ✅ |
| RF3.3 Retroalimentación y calificación | RN-015, RN-016 | CU-005 | HU-24 | `POST/GET/PUT /evaluaciones`, `/comentarios` | ✅ |
| RF3.4 Alertas y notificaciones | RN-023 | CU-009 (parcial) | HU-25 | `alerts.service.js` (job interno cada hora) + `GET /notificaciones` | ✅ |

### RF4 — Comunicación y Colaboración

| RF | RN | CU | HU | Endpoint(s) reales | Estado |
|---|---|---|---|---|---|
| RF4.1 Mensajería interna | — | CU-008 | HU-26 | `POST/GET /mensajes` | ✅ |
| RF4.2 Comentarios en tareas/entregables | RN-015 | — | HU-23 / HU-27 | `POST/GET /comentarios` | ✅ |
| RF4.3 Comunicación docente-aprendiz | — | CU-008 | HU-26 | mismo canal de `/mensajes` (no hay canal separado) | ✅ |
| RF4.4 Notificaciones en tiempo real | RN-021 | CU-009 | HU-28 | `GET/PUT /notificaciones`, WebSocket `/ws`, SSE `/api/v1/notificaciones/stream` | ✅ |

> **RF4.4 en detalle:** las notificaciones se generan y se guardan correctamente
> (RN-021) y ahora se emiten automáticamente en tiempo real mediante WebSocket
> nativo (`/ws`) y canal SSE de respaldo. La interfaz web se actualiza al instante
> sin requerir recargar la página.

### RF5 — Gestión de Tareas y Cronograma

| RF | RN | CU | HU | Endpoint(s) reales | Estado |
|---|---|---|---|---|---|
| RF5.1 Asignación de tareas | RN-017 | CU-006 | HU-29 | `POST /tareas` | ✅ |
| RF5.2 Seguimiento de tareas | — | CU-006 | HU-30 | `PUT /tareas/:id`, `POST /entregas/tarea/:id` (+ `/upload`) | ✅ |
| RF5.3 Calendario de actividades | — | — | HU-22 / HU-32 | `GET /agenda/:id_proyecto/calendario` | ✅ |
| RF5.4 Línea de tiempo | — | — | HU-22 / HU-32 | `GET /agenda/:id_proyecto/timeline` | ✅ |

### RF6 — Integración y Almacenamiento

| RF | RN | CU | HU | Endpoint(s) reales | Estado |
|---|---|---|---|---|---|
| RF6.1 Integración con GitHub | — | — | HU-33 | `POST/GET/PUT/DELETE /github-integration`, `POST/GET /repositorios` | 🟡 |
| RF6.2 Almacenamiento en la nube | — | — | HU-34 | `POST /archivos/upload/:id`, `/entregas/tarea/:id/upload` | 🟡 |
| RF6.3 Exportación de reportes | — | CU-010 | HU-35 | — | ⬜ |

> **RF6.1 en detalle:** se guarda usuario/token de GitHub y la URL del
> repositorio, pero el sistema no consume la API de GitHub todavía (no
> lista commits ni ramas reales) — solo almacenamiento de la referencia.
>
> **RF6.2 en detalle:** la subida de archivos es real y funcional (multer +
> volumen persistente), pero es **almacenamiento local**, no una integración
> con un proveedor cloud (Google Drive/S3) como pedía el RF originalmente.
>
> **RF6.3 en detalle:** sin código ni endpoint todavía — es el único
> requisito funcional completamente sin empezar (HU-35 está documentada
> pero no construida).

---

## 2. Requisitos No Funcionales (RNF) → Verificación

Los RNF no se prueban con un endpoint puntual, sino con una verificación de
arquitectura o de proceso. Se documenta cómo se verificó cada uno, no solo si "se cumple":

| RNF | Descripción | Cómo se verificó | Estado |
|---|---|---|---|
| RNF1.1 | Interfaz intuitiva y moderna | Rediseño de frontend con sistema de diseño consistente (colores sólidos, una sola tipografía) | ✅ |
| RNF1.2 | Navegación en máx. 3 clics | Sidebar con acceso directo a los 8 módulos principales | ✅ |
| RNF1.3 | Accesibilidad WCAG 2.1 AA | No se auditó formalmente con una herramienta (ej. axe, Lighthouse) | ⬜ |
| RNF2.1 | Respuesta < 3 segundos | No se midió con una herramienta de carga (ej. k6, Apache Bench) | ⬜ |
| RNF2.2 | Escalabilidad de usuarios/proyectos | No se probó bajo carga concurrente | ⬜ |
| RNF2.3 | Disponibilidad 99% mensual | No aplica todavía — no hay despliegue en producción monitoreado | ⬜ |
| RNF3.1 | HTTPS, cifrado, tokens | JWT + bcrypt verificados en código y en pruebas en vivo; HTTPS depende del proveedor de despliegue elegido | 🟡 |
| RNF3.2 | Ley 1581 de 2012 | RN-024 documentada; sin auditoría legal formal de cumplimiento | 🟡 |
| RNF3.3 | Control de accesos por rol | Extensamente probado en vivo: bypass de Admin, restricción de Instructor a proyectos propios, Aprendiz sin acceso a gestión de usuarios | ✅ |
| RNF3.4 | Copias de seguridad automáticas | No implementado | ⬜ |
| RNF4.1 | Código modular | Arquitectura por capas: `controllers/` `routes/` `middlewares/` `validators/` `services/` | ✅ |
| RNF4.2 | Documentación técnica actualizada | `docs/03-api/api-rest.md`, `backend/README.md`, esta matriz | ✅ |
| RNF4.3 | Pruebas automatizadas | Sin suite de tests automatizados (Jest/Supertest); las pruebas realizadas fueron manuales end-to-end, documentadas por sesión | ⬜ |
| RNF5.1 | Multiplataforma (navegadores modernos) | Stack estándar (React 18 + Vite); sin matriz de pruebas cross-browser formal | 🟡 |
| RNF5.2 | Responsividad móvil/tablet | Sin verificación explícita en viewports móviles | ⬜ |
| RNF5.3 | Integración con TICs externas | GitHub: parcial (ver RF6.1). Google Drive: no iniciado | 🟡 |

---

## 3. Mejoras de experiencia de usuario — PR #20 (issue #19)

Rama `feature/Mejoras_en_experiencia_de_usuario` → PR #20 a `test`.
Cada fila apunta al commit real en esa rama; todos llevan `(#19)` y se
pueden listar con `git log --grep "(#19)"`. ⚠️ marca los cambios que tocan
backend o base de datos.

**Estado 🟡 en todas las filas:** pasan las pruebas automáticas (backend
221, frontend 179, `pnpm build` y `pnpm audit` sin vulnerabilidades altas) y
se revisaron con capturas reales del frontend con datos de prueba. Falta la
prueba manual en Docker con la base de datos real en los 3 roles; al
completarla, cada fila pasa a ✅.

| Mejora UX | HU / RF relacionado | Archivos o endpoint | Commit / PR | Estado |
|---|---|---|---|---|
| Menú «Tareas» para Instructor y Administrador («Mis Tareas» solo Aprendiz) | RF5.2 · HU-30 | `frontend/src/utils/navegacion.js` | `01702b0` / PR #20 | 🟡 |
| Motivo obligatorio (mín. 10) al solicitar la baja de un aprendiz ⚠️ | RF2.2 · HU-18 | `ProyectoDetallePage.jsx`, `DELETE /equipos/:id` | `daedd29` / PR #20 | 🟡 |
| Sección propia de Solicitudes en el menú (sale de Inicio) | RF1.3 · HU-15 | `pages/SolicitudesPage.jsx`, `App.jsx`, `navegacion.js` | `03bc53b` / PR #20 | 🟡 |
| Avisos (modales) accesibles y consistentes en los 3 roles: ícono, descripción, Escape, foco | RNF5.1 · RNF3.3 | `components/helpers.jsx` (`ModalHeader`, `useModalAccesible`) en todas las vistas con avisos | `313a193`, `d709818`, `00c8cec` / PR #20 | 🟡 |
| Calendario con vistas Mes (cuadrícula tipo almanaque), Semana y Lista | RF5.3 · HU-32 | `pages/CalendarioPage.jsx`, `utils/calendario.js` | `4af3d8d` / PR #20 | 🟡 |
| Contadores sin parpadeo con «reducir movimiento» (arregla prueba intermitente del CI) | RNF4.3 | `components/helpers.jsx` (`NumeroAnimado`) | `a25cda5`, `950ffeb` / PR #20 | 🟡 |
| Usuarios: el Instructor solo ve sus aprendices, sin activar, desactivar ni eliminar ⚠️ | RF1.3 · RN-005 · HU-15 | `GET /usuarios`, `GET /usuarios/buscar`, `UsuariosPage.jsx` | `625c9c0`, `9a87917` / PR #20 | 🟡 |
| Historial del Instructor: sus acciones y las de sus aprendices ⚠️ | RF3.2 · RN-026 · HU-20 | `GET /historial`, `GET /historial/:tabla`, `HistorialPage.jsx` | `c578188`, `a5d40da` / PR #20 | 🟡 |
| Crear aprendiz con todos los campos → solicitud que aprueba el Administrador ⚠️ BD | RF1.1 · RF1.3 · HU-13 | tabla `solicitudes_aprendiz`, `POST/GET /solicitudes/aprendices`, `PUT /solicitudes/aprendices/:id/resolver`, `SolicitudesAprendiz.jsx` | `84243f2`, `659dfb1` / PR #20 | 🟡 |
| Notificaciones del Instructor a sus aprendices, a un proyecto o a un aprendiz; avisos del Administrador destacados ⚠️ | RF4.4 · RN-021 · HU-28 | `POST /notificaciones/broadcast`, `GET /notificaciones/enviadas`, `NotificacionesPage.jsx` | `ae91d2f`, `b9eac88` / PR #20 | 🟡 |
| Roles de equipo con etiquetas de color: elegir, crear, editar y cambiar ⚠️ BD | RF2.2 · HU-18 | tabla `roles_equipo`, `equipos_proyecto.color_rol`, `/roles-equipo`, `PUT /equipos/:id/rol`, `RolesEquipo.jsx` | `b43f13f`, `9407874` / PR #20 | 🟡 |
| Chat enriquecido: formato, emojis, respuestas, firma, encuestas animadas y avisos fijados ⚠️ BD | RF4.1 · RF4.3 · HU-26 | tablas `encuesta_opciones`, `encuesta_votos`; `POST /mensajes/:id/votar`, `PUT /mensajes/:id/fijar`, `/mensajes/firma/mia`, `ChatProyecto.jsx` | `7836ab9`, `eb0097f` / PR #20 | 🟡 |
| Aprendiz con programa obligatorio y máximo 2 proyectos activos visibles al agregarlo ⚠️ | RF2.2 · RN-001 · HU-18 | `POST /equipos`, `GET /usuarios?alcance=disponibles`, `ProyectoDetallePage.jsx` | `5f77602`, `361f4b9` / PR #20 | 🟡 |

**Migraciones para bases ya creadas** (ejecutar una vez, en este orden):
`database/migracion_solicitudes_aprendiz.sql` →
`database/migracion_roles_equipo.sql` →
`database/migracion_mensajes_enriquecidos.sql`.
Con `docker compose down -v` no hacen falta: `001_schema.sql` ya trae todo.

**Pendiente conocido (fuera de este PR):** en pantallas de celular el
sidebar no se contrae y comprime el contenido (RNF5.2).

---

## 4. Resumen ejecutivo

| Categoría | Hecho ✅ | Parcial 🟡 | Pendiente ⬜ | Total |
|---|---|---|---|---|
| Requisitos Funcionales (RF) | 21 | 2 | 1 | 24 |
| Requisitos No Funcionales (RNF) | 5 | 4 | 7 | 16 |

**Cobertura funcional real: 87.5% completo, 8.3% parcial, 4% sin iniciar.**

El único pendiente funcional que queda por decisión propia del equipo
(no por olvido): **RF6.3 exportación de reportes** — documentado en
`docs/07-deuda-tecnica.md` como trabajo futuro.

---

> ✍️ **Generado por:** revisión cruzada contra el código real de la rama `test`.
> 📅 **Última actualización:** ver historial de commits de este archivo.
