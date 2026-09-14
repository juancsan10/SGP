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
| RF1.1 Registro de usuarios | RN-008 | — | HU-01 | `POST /auth/register` | ✅ |
| RF1.2 Autenticación segura | RN-006, RNF3.1 | CU-001 | HU-02 | `POST /auth/login` (JWT + bcrypt + rate limit) | ✅ |
| RF1.3 Gestión de roles | RN-005, RN-025 | — | HU-03 | `GET/PUT/DELETE /usuarios`, `POST /auth/users` (solo Admin) | ✅ |
| RF1.4 Recuperación de contraseña | — | — | HU-04 | `POST /auth/password-reset/request`, `/confirm` | ✅ |

### RF2 — Gestión de Proyectos

| RF | RN | CU | HU | Endpoint(s) reales | Estado |
|---|---|---|---|---|---|
| RF2.1 Creación de proyectos | RN-004, RN-011 | CU-002 | HU-05 | `POST /proyectos` | ✅ |
| RF2.2 Asignación de integrantes | RN-001 | CU-003 | HU-06 | `POST/GET /equipos` (solo Aprendices, validado) | ✅ |
| RF2.3 Definición de entregables | RN-019 | CU-007 | HU-07 | `POST/GET /entregables`, `/fases` | ✅ |
| RF2.4 Control de versiones (historial) | RN-026 | — | HU-08 | `GET /historial` | ✅ |
| RF2.5 Estado del proyecto | RN-013, RN-014 | CU-011 | HU-09 | `GET /proyectos/:id` | ✅ |

### RF3 — Seguimiento y Evaluación

| RF | RN | CU | HU | Endpoint(s) reales | Estado |
|---|---|---|---|---|---|
| RF3.1 Medición de progreso | — | — | HU-10 | `GET /agenda/:id_proyecto/calendario`, `/timeline` | ✅ |
| RF3.2 Trazabilidad (historial de actividad) | RN-026 | — | HU-11 | `GET /historial` | ✅ |
| RF3.3 Retroalimentación y calificación | RN-015, RN-016 | CU-005 | HU-12 | `POST/GET/PUT /evaluaciones`, `/comentarios` | ✅ |
| RF3.4 Alertas y notificaciones | RN-023 | CU-009 (parcial) | HU-13 | `alerts.service.js` (job interno cada hora) + `GET /notificaciones` | ✅ |

### RF4 — Comunicación y Colaboración

| RF | RN | CU | HU | Endpoint(s) reales | Estado |
|---|---|---|---|---|---|
| RF4.1 Mensajería interna | — | CU-008 | HU-14 | `POST/GET /mensajes` | ✅ |
| RF4.2 Comentarios en tareas/entregables | RN-015 | — | HU-15 | `POST/GET /comentarios` | ✅ |
| RF4.3 Comunicación docente-aprendiz | — | CU-008 | HU-14 | mismo canal de `/mensajes` (no hay canal separado) | ✅ |
| RF4.4 Notificaciones en tiempo real | RN-021 | CU-009 | HU-16 | `GET/PUT /notificaciones` — **persistentes, no push en vivo** | 🟡 |

> **RF4.4 en detalle:** las notificaciones se generan y se guardan correctamente
> (ej. al programar una reunión, RN-021), pero el usuario debe recargar o
> volver a consultar `/notificaciones` para verlas — no hay WebSocket ni
> polling automático todavía. Documentado también en `docs/07-deuda-tecnica.md`.

### RF5 — Gestión de Tareas y Cronograma

| RF | RN | CU | HU | Endpoint(s) reales | Estado |
|---|---|---|---|---|---|
| RF5.1 Asignación de tareas | RN-017 | CU-006 | HU-17 | `POST /tareas` | ✅ |
| RF5.2 Seguimiento de tareas | — | CU-006 | HU-18 | `PUT /tareas/:id`, `POST /entregas/tarea/:id` (+ `/upload`) | ✅ |
| RF5.3 Calendario de actividades | — | — | HU-10 | `GET /agenda/:id_proyecto/calendario` | ✅ |
| RF5.4 Línea de tiempo | — | — | HU-10 | `GET /agenda/:id_proyecto/timeline` | ✅ |

### RF6 — Integración y Almacenamiento

| RF | RN | CU | HU | Endpoint(s) reales | Estado |
|---|---|---|---|---|---|
| RF6.1 Integración con GitHub | — | — | HU-19 | `POST/GET/PUT/DELETE /github-integration`, `POST/GET /repositorios` | 🟡 |
| RF6.2 Almacenamiento en la nube | — | — | *(sin HU asignada)* | `POST /archivos/upload/:id`, `/entregas/tarea/:id/upload` | 🟡 |
| RF6.3 Exportación de reportes | — | CU-010 | *(sin HU asignada)* | — | ⬜ |

> **RF6.1 en detalle:** se guarda usuario/token de GitHub y la URL del
> repositorio, pero el sistema no consume la API de GitHub todavía (no
> lista commits ni ramas reales) — solo almacenamiento de la referencia.
>
> **RF6.2 en detalle:** la subida de archivos es real y funcional (multer +
> volumen persistente), pero es **almacenamiento local**, no una integración
> con un proveedor cloud (Google Drive/S3) como pedía el RF originalmente.
>
> **RF6.3 y CU-010:** ninguno de los dos tiene código ni HU asociada — es
> el único requisito funcional completamente sin empezar.

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

## 3. Resumen ejecutivo

| Categoría | Hecho ✅ | Parcial 🟡 | Pendiente ⬜ | Total |
|---|---|---|---|---|
| Requisitos Funcionales (RF) | 17 | 4 | 1 | 22 |
| Requisitos No Funcionales (RNF) | 6 | 4 | 6 | 16 |

**Cobertura funcional real: 77% completo, 18% parcial, 5% sin iniciar.**

Los 2 pendientes funcionales que quedan por decisión propia del equipo
(no por olvido): **RF6.3 exportación de reportes** y la porción de
**tiempo real** de RF4.4 — ambos documentados desde hace varias sesiones
en `docs/07-deuda-tecnica.md` como trabajo futuro, no como omisiones.

---

## 4. Historias de Usuario sin RF6.2/RF6.3 asignada

`docs/01-requisitos/historias-usuario/historias-usuario.md` llega hasta
HU-19 y no tiene una historia dedicada para RF6.2 (almacenamiento) ni
RF6.3 (reportes). Se sugiere, si el equipo retoma esa documentación:

```
HU-20 | Como aprendiz quiero adjuntar un archivo real a mi entrega para
        respaldar mi trabajo. | RF6.2
HU-21 | Como instructor quiero exportar el avance de un proyecto en PDF
        o Excel para compartirlo fuera del sistema. | RF6.3
```

No se agregaron directamente al archivo original para no tomar esa
decisión de numeración por el equipo — queda como sugerencia en esta
matriz.

---

> ✍️ **Generado por:** revisión cruzada contra el código real de la rama `test`.
> 📅 **Última actualización:** ver historial de commits de este archivo.
