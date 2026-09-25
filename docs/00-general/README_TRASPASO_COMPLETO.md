# 📘 SGP SENA — Estado completo del proyecto

> Documento de traspaso. Escrito para que cualquier persona (o cualquier
> chat nuevo con un asistente de IA) pueda retomar este proyecto sin
> haber estado en las sesiones anteriores. Todo lo descrito aquí fue
> **verificado en vivo** contra una base de datos MariaDB real, no solo
> revisado en el código — donde algo quedó pendiente, se dice explícitamente.

---

## 1. Qué es este proyecto

**SGP SENA** (Sistema de Gestión de Proyectos SENA) es una plataforma de
gestión de proyectos que conecta instructores y aprendices del programa
de formación en Análisis y Desarrollo de Software del SENA. Cubre el
ciclo completo: fases, tareas, entregables, entregas, reuniones,
mensajería, notificaciones y trazabilidad.

**Equipo:** 3 personas — Rubiel Rodríguez (backend/base de datos), Juan
Manuel Arcila (frontend), Juan Carlos Sánchez (QA/documentación).

**Repositorio:** `github.com/juancsan10/SGP` · rama de trabajo: `test`
(flujo `test → develop → main`, con PR requeridos, Conventional Commits).

---

## 2. Stack técnico

| Capa | Tecnología |
|---|---|
| Backend | Node.js + Express, MySQL/MariaDB (Docker) |
| Frontend | React 18 + Vite, React Router |
| Autenticación | JWT + bcrypt, rate limiting en login |
| Gestor de paquetes | **pnpm** (no usar npm — genera lockfiles duplicados que hay que limpiar) |
| Tipografía | **Manrope** en todo (`--font-display` / `--font-body`) |

---

## 3. Identidad visual — "Modern Flat" (decisión final, ya cerrada)

Se pasó por 2 direcciones de diseño antes de llegar a la definitiva:

1. ~~"Bitácora de Taller"~~ — papel envejecido, tipografía serif (Fraunces)
   + monoespaciada (IBM Plex Mono). **Descartada.**
2. **"Modern Flat"** (actual) — inspirada en Linear/Notion/Vercel:
   - Una sola tipografía (**Manrope**) en todo, sin serif.
   - Colores **sólidos** para estados (chips con fondo lleno, no píldoras
     pastel con borde).
   - Sidebar oscuro sólido, sin gradientes.
   - Sombras suaves y difusas (nunca duras/offset).
   - Esquinas redondeadas consistentes (8-16px).
   - Un acento de color distinto por rol: índigo (Admin), azul
     (Instructor), verde (Aprendiz — el verde institucional del SENA).

⚠️ **Nota de esta sesión:** quedaban 2 comentarios de encabezado en
`LoginPage.jsx` y `LoginPage.css` que todavía decían "identidad Bitácora
de Taller" — nunca se veían en pantalla (eran solo comentarios internos),
pero contradecían la decisión ya tomada. Se corrigieron a "Proyecto SENA".

**Componentes reutilizables clave** (en `frontend/src/components/helpers.jsx`):
- `Pagination` — paginación numerada, funciona tanto con endpoints
  paginados del servidor como recortando un array ya cargado del lado
  del cliente.
- `ConfirmModal` — reemplaza `confirm()`/`alert()` nativos del navegador;
  ícono según tipo (`advertencia` ⚠️ / `peligro` 🛑 / `info` ℹ️), botones
  diferenciados. **Ya no queda ningún `confirm()`/`alert()` nativo en
  todo el frontend** — se verificó con grep en la última pasada.

---

## 4. Roles y permisos (RBAC) — regla general

> **El Administrador supervisa, no opera.** Solo el Instructor responsable
> de un proyecto puede crear su estructura operativa.

| Acción | Aprendiz | Instructor | Administrador |
|---|---|---|---|
| Crear fases, entregables, tareas, repositorios, reuniones | ❌ | ✅ (solo en sus proyectos) | ❌ |
| Editar el estado de una tarea | ❌ | ✅ | ❌ (se quitó el bypass) |
| Entregar/corregir una tarea (`entregas_tareas`) | ✅ (solo la propia) | ❌ | ❌ |
| Revisar/calificar una entrega (0-100, obligatoria al aprobar) | ❌ | ✅ (solo sus proyectos) | ❌ — solo **ve** la calificación y la retroalimentación |
| Comentar, adjuntar o borrar archivos en un entregable | ✅ | ✅ | ❌ — solo **revisa** y abre los documentos |
| Evaluar (calificar) un entregable | ❌ | ✅ | ❌ (antes el Admin sí podía; se quitó) |
| Agregar un aprendiz al equipo | ❌ | ✅ | ❌ |
| Quitar un aprendiz del equipo | ❌ | 🟡 solo **solicita** la baja | ✅ aprueba/rechaza la solicitud |
| Habilitar/deshabilitar un repositorio, cambiar su semáforo | ❌ | ❌ | ✅ |
| Enviar un mensaje | ✅ | ✅ | ✅ (pasa por el mismo filtro de lenguaje) |
| Editar un mensaje propio | ✅ (solo el propio) | ✅ (solo el propio) | ✅ (solo el propio — ni Admin edita ajenos) |
| Crear notificaciones (broadcast) | ❌ | ❌ | ✅ |
| Buscar usuarios por cédula | ❌ | ✅ | ✅ (cualquier rol, no solo Aprendiz) |
| Activar/desactivar usuarios | ❌ | ❌ | ✅ (excepto a sí mismo: el Admin es único y está protegido) |
| Eliminar usuarios | ❌ | ❌ | ✅ sin excepciones, **siempre con cuestionario** (motivo + descripción + soportes) |
| Editar cc y correo de un usuario | ❌ (ni el propio) | ❌ (ni el propio) | ✅ |
| Enviar solicitudes al Administrador | ✅ | ✅ | ❌ — las atiende o rechaza desde el panel de control |
| Crear usuarios | ❌ (autoregistro como Aprendiz) | ❌ | ✅ solo Instructores |

> **Administrador único.** El sistema tiene un solo Administrador
> (`rubiel.tads@gmail.com`). No se pueden crear más desde la
> plataforma, y ese Administrador no se puede desactivar ni eliminar
> (el backend responde 403 y la interfaz muestra "🔒 Cuenta principal"
> en lugar de los botones).

El middleware clave es `requireInstructorOwner` en
`backend/src/middlewares/auth.middleware.js` — a diferencia de
`requireProjectManager`, **no tiene bypass de Administrador**. Se usa en
las rutas `POST` de fases, entregables, tareas, equipos, repositorios y
reuniones.

---

## 5. Estado por módulo

### 5.1 Usuarios
- Filtros de servidor (rol, estado, texto) + paginación numerada.
- Buscador por identificación ampliado a **cualquier rol** (antes solo
  Aprendiz).
- Activar / Desactivar (con `ConfirmModal`, no `confirm()`).
- **Editar**: el Admin ahora también corrige **cc y correo** (validación de
  formato y unicidad; un usuario editando su propio perfil no puede cambiarlos).
- **Eliminar sin excepciones, con cuestionario obligatorio**
  (`EliminarUsuarioModal.jsx`): motivo (lista cerrada), descripción de al
  menos 20 caracteres, hasta 5 archivos de soporte (PDF/JPG/PNG/WEBP, 10 MB)
  y confirmación explícita. Antes de confirmar muestra el impacto. Qué pasa
  con los datos:
  - Proyectos que dirige un instructor → se **reasignan** al instructor que
    elija el Admin en el cuestionario (obligatorio si tiene proyectos).
  - Tareas asignadas, sus entregas y membresías de equipo → se eliminan.
  - Mensajes, comentarios y evaluaciones → se conservan como "Usuario eliminado".
  - Historial de cambios → se conserva con el nombre y cc de respaldo.
  - Todo queda en `eliminaciones_usuario` + `eliminaciones_archivos`, visible
    en Historial → "Usuarios eliminados".
  - El antiguo `DELETE /usuarios/:id/permanente` (que bloqueaba y no pedía
    justificación) se **reemplazó** por `POST /usuarios/:id/eliminacion`.
- `+ Nuevo instructor` (Admin crea **solo Instructores**; el registro
  de Aprendiz sigue siendo autoservicio vía `/auth/register`). Ya no se
  pueden crear Administradores: el sistema tiene uno solo.

### 5.2 Proyectos → detalle de proyecto (8 pestañas)
- **Fases / Entregables / Tareas / Equipo / Repositorios / Reuniones**:
  botón de creación visible solo para Instructor (`canCreate`, no
  `canEdit` — esa distinción se agregó a mitad de proyecto para separar
  "puede editar" de "puede crear").
- **Equipo**: el Instructor ya no borra directo — botón "Solicitar baja"
  crea un registro en `solicitudes_equipo`; el Admin ve un panel de
  solicitudes pendientes en la misma pestaña con Aprobar/Rechazar.
- **Mensajes**: glosario de palabras prohibidas (`utils/glosario-prohibido.js`)
  — un mensaje con lenguaje inapropiado se rechaza y genera una alerta
  automática al infractor. **Crear y editar** funcionan (`PUT /mensajes/:id`,
  solo el autor real puede editar su propio mensaje, el glosario también
  aplica al editar). Toda creación/edición exitosa se registra en
  trazabilidad (antes solo se registraban los mensajes *bloqueados*).
- **Repositorios**: semáforo de cumplimiento (verde/amarillo/rojo) +
  habilitar/deshabilitar, ambos solo Admin. Si el semáforo pasa a
  amarillo/rojo, se notifica automáticamente al instructor responsable.
- Paginación agregada a las 3 pestañas que no la tenían: Equipo,
  Repositorios, Reuniones.

- **Pestaña "Revisión" (solo Admin, `RevisionProyecto.jsx`)**: por cada
  entregable muestra documentos adjuntos (se abren en otra pestaña),
  comentarios del instructor y de los aprendices (con su rol) y la
  evaluación; abajo, las entregas de tareas con calificación, material y
  retroalimentación. Filtros: con documentos / con comentarios / evaluados.
- En el modal "Ver detalle" de un entregable el Admin queda en **solo
  lectura**: no ve el formulario de comentar, adjuntar, borrar ni calificar
  (y el backend lo rechaza con `denyAdmin`).

### 5.3 Tareas (`/tareas`)
- Vista dual: Aprendiz ve sus tareas (paginado del lado del cliente);
  Admin/Instructor ven un listado global (`GET /tareas`, paginado del
  servidor) con **ambas cédulas** (aprendiz + instructor responsable) y
  filtros por cc/proyecto/estado/prioridad.

- **Nueva columna "Calificación"** en la vista de supervisión, con
  "Ver revisión →" que abre `DetalleEntregaModal` (solo lectura).

### 5.4 Entregas (`/entregas`)
- Aprendiz/Instructor: flujo operativo sin cambios (entregar, corregir,
  revisar, subir archivo).
- Admin: vista de **solo supervisión** (`GET /entregas`) con columna de
  calificación y botón "👁️ Revisar" → detalle completo de solo lectura
  (comentario y archivo del aprendiz, estado, calificación, retroalimentación,
  fechas). El backend sigue rechazando que el Admin califique.
- Instructor: al revisar asigna una **calificación 0-100** (nueva columna
  `entregas_tareas.calificacion`), obligatoria para aprobar. Si el aprendiz
  corrige, la calificación se reinicia.

### 5.5 Notificaciones (`/notificaciones`)
- Pestaña **"Recibidas"** (todo usuario) y **"Enviadas por mí"** (solo
  Admin, nueva esta sesión).
- **Bug real corregido esta sesión:** no existía ninguna columna que
  guardara quién creó una notificación de broadcast — el Admin no tenía
  forma de ver lo que él mismo había enviado. Se agregó `id_creador` a
  la tabla `notificaciones`, y `GET /notificaciones/enviadas` agrupa las
  N filas de un mismo envío (una por destinatario) en un solo resultado,
  con conteo de destinatarios y de cuántos ya la leyeron.
- Formulario de broadcast: destinatario (usuario puntual o rol completo),
  tipo (informativo/mantenimiento/advertencia), prioridad (baja/media/alta).

### 5.6 Historial (`/historial`, solo Admin)
- Dashboard de estadísticas consolidadas arriba (tarjetas de totales +
  gráficas de barra simples "por tabla" y "por tipo de acción" + top 10
  usuarios más activos).
- Búsqueda detallada abajo, con filtros de servidor y paginación.

- **Nuevo: "Usuarios eliminados"** — tabla con buscador y paginación; cada
  fila abre la justificación (motivo, descripción, archivos, información
  afectada, quién y cuándo).

### 5.7 Dashboard (`/dashboard`, todos los roles)
- **Nuevo: sección "Solicitudes" (`SolicitudesPanel.jsx`)**.
  - Admin: bandeja con pestañas Pendientes/Atendidas/Rechazadas/Todas,
    filtro por rol, y las bajas de equipo pendientes de los instructores
    (aprobar/rechazar ahí mismo). Atender o rechazar exige una respuesta
    que le llega al solicitante como notificación.
  - Instructor/Aprendiz: "Mis solicitudes al Administrador" + "Nueva
    solicitud" (tipo, proyecto opcional, asunto, descripción). Al enviarla,
    el Admin recibe una notificación.
  - Tipos: Actualización de datos, Soporte técnico, Acceso o cuenta,
    Proyecto o equipo, Otro.
- **Bug real corregido esta sesión (x2):** los paneles "Tareas recientes"
  y "Mensajes recientes" armaban su lista pidiendo datos solo de "los 5
  proyectos creados más recientemente" — un mensaje o tarea en cualquier
  proyecto fuera de ese top-5 quedaba guardado en la base de datos pero
  invisible en el Dashboard. Se corrigió con 2 endpoints dedicados
  (`GET /tareas/recientes/dashboard`, `GET /mensajes/recientes/dashboard`)
  que resuelven el alcance correcto por rol directamente en SQL, sin
  depender de qué proyectos "ganaron" un recorte del lado del cliente.
  **Reproducido y verificado en vivo** antes de corregir (se sembraron
  6 proyectos extra para forzar el escenario del bug).

### 5.8 Calendario y Línea de tiempo
⬜ **Pendiente** — es el único módulo grande de la lista original que
todavía no se tocó. La idea planteada (no implementada): integrar el
estado que da el instructor por proyecto con la línea de tiempo, para
que ambas vistas trabajen de la mano.

---

## 6. Endpoints nuevos creados en total

```
POST   /auth/users                          Admin crea Instructores (ya no Administradores)
GET    /usuarios/buscar                     Busca por cc, cualquier rol
PUT    /usuarios/:id/activar
DELETE /usuarios/:id/permanente

GET    /equipos/solicitudes/listar
PUT    /equipos/solicitudes/:id/resolver

PUT    /repositorios/:id/estado             Habilitar/deshabilitar
PUT    /repositorios/:id/semaforo

POST   /notificaciones/broadcast
GET    /notificaciones/enviadas             NUEVO esta sesión

PUT    /mensajes/:id                        Editar mensaje propio
GET    /mensajes/recientes/dashboard        NUEVO esta sesión

GET    /tareas/recientes/dashboard          NUEVO esta sesión
GET    /tareas                              Listado global (Admin/Instructor)
GET    /entregas                            Listado global de supervisión

GET    /historial                           Con filtros + paginación
GET    /historial/estadisticas/dashboard

-- Sesión: supervisión del Administrador
GET    /proyectos/:id/revision              Admin: documentos, comentarios, evaluaciones y entregas
GET    /entregas/:id/detalle                Admin/Instructor: detalle de solo lectura
PUT    /usuarios/:id                        Ahora acepta correo e identificacion (solo Admin)
GET    /usuarios/:id/impacto-eliminacion    Qué se afectará + instructores de reemplazo
POST   /usuarios/:id/eliminacion            Cuestionario multipart (reemplaza DELETE /:id/permanente)
GET    /historial/eliminaciones             Usuarios eliminados (paginado, buscador)
GET    /historial/eliminaciones/:id         Justificación + archivos
GET    /solicitudes/tipos
GET    /solicitudes/mias                    Instructor/Aprendiz
POST   /solicitudes                         Instructor/Aprendiz
GET    /solicitudes                         Admin (filtros estado, tipo, rol, q)
PUT    /solicitudes/:id/resolver            Admin: Atendida | Rechazada + respuesta
```

---

## 7. Bugs reales encontrados y corregidos (cronológico, los importantes)

1. **`requireSelfOrAdmin` roto** — comparaba siempre contra `req.params.id`,
   pero notificaciones usa `:id_usuario` como nombre de parámetro.
   Resultado: ningún usuario podía ver sus propias notificaciones.
2. **FK sin `ON DELETE SET NULL`** en `solicitudes_equipo` — bloqueaba el
   borrado del equipo al aprobar una solicitud.
3. **Conflictos de Git sin resolver** (`<<<<<<<`, `=======`, `>>>>>>>`)
   literales en `index.css` y `LoginPage.jsx` — impedían compilar el
   frontend por completo. Resueltos a favor de la versión más completa.
4. **Bypass de Admin en `requireTaskDeliveryReview` y
   `requireTaskOwnerOrAdmin`** — contradecía "Entregas: no edita ni crea,
   solo supervisa". Se quitó el bypass en ambos.
5. **`Promise.all` en vez de `Promise.allSettled`** en `ProyectoDetallePage.jsx`
   — si UNA sola llamada fallaba (ej. `usuarios` para un Aprendiz, que no
   tiene permiso), toda la página se caía sin mostrar nada.
6. **Dashboard con recorte silencioso** (ver 5.7) — el bug más sutil de
   todos: los datos se guardaban perfecto, pero el Dashboard nunca los
   pedía si el proyecto no estaba en el "top 5 más reciente".
7. **`createUserByAdmin` no guardaba `identificacion`** — un Instructor
   creado por el Admin quedaba invisible para el buscador por cédula.
8. **`normalizeEmail()` quitaba los puntos de los correos Gmail** — con
   sus opciones por defecto, `rubiel.tads@gmail.com` llegaba al login
   como `rubieltadsadmin@gmail.com` y no coincidía con la BD, así que
   nadie con Gmail podía iniciar sesión. Ahora solo se pasa a minúsculas
   (`NORMALIZE_EMAIL_OPTS` en `validators/auth.validators.js`).
9. **Múltiples `catch` que solo hacían `console.error`** — el usuario no
   recibía ningún aviso visible cuando fallaba cargar una lista, marcar
   una notificación como leída, o cambiar el estado de una tarea.

---

## 8. Cambios de schema acumulados (respecto al schema original)

```sql
-- usuarios
ADD COLUMN identificacion VARCHAR(30) UNIQUE

-- notificaciones
ADD COLUMN prioridad VARCHAR(20) DEFAULT 'Media'
ADD COLUMN id_creador INT NULL, FK -> usuarios(id_usuario)

-- repositorios
ADD COLUMN activo BOOLEAN DEFAULT TRUE
ADD COLUMN estado_semaforo VARCHAR(20) DEFAULT 'verde'

-- mensajes
ADD COLUMN fecha_edicion DATETIME NULL

-- tabla nueva
CREATE TABLE solicitudes_equipo (...)  -- FK a equipos_proyecto con ON DELETE SET NULL

-- Sesión: supervisión del Administrador
-- entregas_tareas
ADD COLUMN calificacion DECIMAL(5,2) NULL           -- 0 a 100
-- autoría que sobrevive a la eliminación de un usuario (NULL = eliminado)
mensajes.id_remitente, comentarios.id_usuario, evaluaciones.id_usuario → NULL + ON DELETE SET NULL
-- historial_cambios
ADD COLUMN usuario_eliminado VARCHAR(250) NULL      -- nombre y cc de respaldo
-- tablas nuevas
CREATE TABLE eliminaciones_usuario (...)    -- cuestionario + copia de los datos del usuario
CREATE TABLE eliminaciones_archivos (...)   -- soportes del cuestionario
CREATE TABLE solicitudes (...)              -- solicitudes de Instructor/Aprendiz al Admin
```

Cada vez que se toca el schema, hay que recrear el volumen de Docker:
```bash
docker compose down -v
docker compose up -d --build
docker compose exec backend node database/seed.js
```

---

## 9. Seed de datos — qué trae ahora

Ampliado en la última sesión: **13 usuarios, 7 proyectos, 15 tareas, 12
entregables, 6 repositorios** (con semáforo variado, no todos en verde),
**1 solicitud de equipo pendiente** de ejemplo, **2 envíos de
notificaciones ya hechos por el Administrador** (para que la pestaña
"Enviadas por mí" no arranque vacía), **3 solicitudes al Administrador**
(2 pendientes), **2 evaluaciones**, calificaciones en las entregas revisadas
y **2 adjuntos PDF reales** (el seed genera un PDF de ejemplo en `uploads/`
para que los documentos se puedan abrir).

**Credenciales:**

| Rol | Correo | Contraseña |
|---|---|---|
| Administrador (único) | `rubiel.tads@gmail.com` | La definida en `ADMIN_CONTRASENA` de `backend/database/seed.js` |
| Instructor | `laura.gomez@sgpsena.local` / `miguel.torres@sgpsena.local` | `Sena2026*` |
| Aprendiz | `carlos.herrera@sgpsena.local` (cc `1098765001`) | `Sena2026*` |

La cuenta anterior `diana.rios@sgpsena.local` ya no existe. El panel
"Cuentas de demo" del login ya no muestra la fila del Administrador.

Para aplicar el Administrador único **sin vaciar** una base de datos
existente (el seed sí la vacía):
```bash
docker compose exec backend node database/admin-unico.js
```
Actualiza al Administrador existente y, si hubiera otros, los pasa a
Instructor desactivados.

---

## 10. Pendiente / próximos pasos sugeridos

1. **Calendario + Línea de tiempo** integrados (único módulo grande sin tocar).
2. ~~La evaluación de entregables no se restringió para Admin~~ —
   **resuelto**: ahora solo el instructor evalúa; el Admin solo revisa.
3. `cargarSolicitudesEquipo` y la carga del detalle de un entregable
   (comentarios/archivos/evaluación) siguen con `catch` silencioso — son
   cargas de fondo, no acciones que el usuario dispara directo, así que
   el impacto es menor, pero quedaron identificadas sin corregir.
4. La contraseña del Administrador está en texto plano en `seed.js` y
   `admin-unico.js`. Si el repositorio es público, conviene moverla al
   `.env` (ya está en `.gitignore`).
5. En el detalle de un proyecto, la vista del Aprendiz sigue pidiendo
   `GET /usuarios` (403 esperado, absorbido por `Promise.allSettled`). No
   rompe nada, pero ensucia la consola; se podría omitir esa llamada para
   el rol Aprendiz.
6. Los archivos subidos se sirven en `/uploads` sin autenticación (nombre
   aleatorio, pero cualquiera con el enlace los abre). Aplica también a los
   soportes de eliminación.
7. Sin pruebas automatizadas (Jest/Supertest) — toda la verificación de
   este proyecto ha sido manual end-to-end contra MariaDB real.

---

## 11. Cómo levantar todo desde cero

```bash
cd SGP
docker compose down -v
docker compose up -d --build
docker compose exec backend node database/seed.js
```

Si algo no carga bien tras `up -d --build`, revisa primero
`docker compose logs backend` — el problema más común históricamente ha
sido el archivo `.env` (debe estar en la **raíz** del proyecto, no dentro
de `backend/`).

---

## 12. Cómo verificar que algo realmente funciona (método usado en todo este proyecto)

No basta con que compile. El patrón que se siguió en cada corrección:

1. Levantar MariaDB real + `node database/seed.js`.
2. Levantar el backend y probar el endpoint con `curl` real (login → token → petición).
3. Si el bug es de frontend, levantar `pnpm run dev` + Playwright
   (headless Chromium) para capturar una screenshot real de la pantalla,
   no solo confiar en que el JSX se ve bien en el código.
4. Recién ahí empaquetar y entregar.

Esto encontró bugs reales que una simple revisión de código nunca habría
detectado (ver sección 7).
