# Informe de pruebas unitarias automatizadas — SGP SENA

**Fecha de ejecución:** 2026-11-20 · **Rama:** `semana-7` (commit `1c861ae`) · **Herramienta:** Vitest · **Comando:** `pnpm test` en `backend/` y en `frontend/`

## 1. Resumen

| Capa | Archivos de prueba | Casos | Pasan | Fallan | Omitidos |
|---|---|---|---|---|---|
| Backend (API) | 30 | **339** | 339 | 0 | 0 |
| Frontend (React) | 35 | **333** | 333 | 0 | 0 |
| **Total unitarias** | 65 | **672** | 672 | 0 | 0 |
| Integración con BD real (aparte, ver §5) | 2 | 20 | 20 | 0 | 0 |

**Criterio mínimo (≥ 20 casos distintos): cumplido con amplio margen** (672 casos unitarios en 65 archivos).

## 2. Cobertura (Vitest + v8)

| Capa | Sentencias | Ramas | Funciones | Líneas |
|---|---|---|---|---|
| Backend | 70.24 % | 68.32 % | 71.91 % | 75.60 % |
| Frontend | 72.39 % | 64.29 % | 67.39 % | 75.55 % |

Los umbrales mínimos viven en `backend/vitest.config.mjs` y `frontend/vite.config.js`; el CI falla si la cobertura baja de ellos. El histórico semanal está en `docs/matriz-rotacion.md`.

## 3. Casos por archivo — Backend

| Archivo | Casos | Resultado |
|---|---|---|
| `tests/app.test.js` | 4 | ✅ |
| `tests/auth.controller.test.js` | 11 | ✅ |
| `tests/auth.middleware.test.js` | 24 | ✅ |
| `tests/colaboracion.controller.test.js` | 28 | ✅ |
| `tests/contrato-front.api.test.js` | 11 | ✅ |
| `tests/env.test.js` | 8 | ✅ |
| `tests/entregables.controller.test.js` | 15 | ✅ |
| `tests/entregas.api.test.js` | 10 | ✅ |
| `tests/equipos-baja.api.test.js` | 3 | ✅ |
| `tests/equipos-limites.test.js` | 4 | ✅ |
| `tests/fases.controller.test.js` | 19 | ✅ |
| `tests/glosario-prohibido.test.js` | 10 | ✅ |
| `tests/historial.controller.test.js` | 5 | ✅ |
| `tests/mensajes-enriquecidos.test.js` | 14 | ✅ |
| `tests/mensajes.controller.test.js` | 3 | ✅ |
| `tests/notificacion-resiliencia.test.js` | 2 | ✅ |
| `tests/notificaciones-instructor.api.test.js` | 9 | ✅ |
| `tests/proyectos.api.test.js` | 6 | ✅ |
| `tests/proyectos.controller.test.js` | 19 | ✅ |
| `tests/recuperacion-codigo.test.js` | 6 | ✅ |
| `tests/recuperacion-correo.test.js` | 5 | ✅ |
| `tests/roles-equipo.api.test.js` | 11 | ✅ |
| `tests/seguridad.api.test.js` | 9 | ✅ |
| `tests/solicitudes-aprendiz.controller.test.js` | 14 | ✅ |
| `tests/solicitudes.api.test.js` | 8 | ✅ |
| `tests/tareas.controller.test.js` | 13 | ✅ |
| `tests/tiempo-real.test.js` | 8 | ✅ |
| `tests/usuarios.controller.test.js` | 23 | ✅ |
| `tests/validators.test.js` | 19 | ✅ |

## 4. Casos por archivo — Frontend

| Archivo | Casos | Resultado |
|---|---|---|
| `tests/App.test.jsx` | 3 | ✅ |
| `tests/AppLayout.test.jsx` | 4 | ✅ |
| `tests/CalendarioPage.test.jsx` | 4 | ✅ |
| `tests/CalificacionEntrega.test.jsx` | 12 | ✅ |
| `tests/ChatProyecto.test.jsx` | 6 | ✅ |
| `tests/DashboardPage.test.jsx` | 3 | ✅ |
| `tests/EliminarUsuarioModal.test.jsx` | 8 | ✅ |
| `tests/EntregasPage.test.jsx` | 4 | ✅ |
| `tests/HistorialPage.test.jsx` | 6 | ✅ |
| `tests/LoginPage.test.jsx` | 5 | ✅ |
| `tests/NotificacionesPage.test.jsx` | 8 | ✅ |
| `tests/NotificacionesTiempoReal.test.jsx` | 8 | ✅ |
| `tests/PasswordRecovery.test.jsx` | 6 | ✅ |
| `tests/ProyectoDetallePage.pestanas.test.jsx` | 10 | ✅ |
| `tests/ProyectoDetallePage.test.jsx` | 8 | ✅ |
| `tests/ProyectosPage.test.jsx` | 7 | ✅ |
| `tests/RevisionProyecto.test.jsx` | 5 | ✅ |
| `tests/RolesEquipo.test.jsx` | 6 | ✅ |
| `tests/SolicitudesAprendiz.test.jsx` | 6 | ✅ |
| `tests/SolicitudesPage.test.jsx` | 2 | ✅ |
| `tests/SolicitudesPanel.test.jsx` | 6 | ✅ |
| `tests/TareasPage.test.jsx` | 3 | ✅ |
| `tests/UsuariosPage.test.jsx` | 6 | ✅ |
| `tests/api.test.js` | 110 | ✅ |
| `tests/avisos.test.jsx` | 6 | ✅ |
| `tests/calendario.test.js` | 5 | ✅ |
| `tests/filtros.test.js` | 11 | ✅ |
| `tests/formatoMensaje.test.jsx` | 7 | ✅ |
| `tests/helpers.test.jsx` | 7 | ✅ |
| `tests/navegacion.test.js` | 5 | ✅ |
| `tests/paginacion.test.js` | 9 | ✅ |
| `tests/validaciones-usuario.test.js` | 17 | ✅ |

## 5. Pruebas de integración (BD real)

20 casos en `backend/tests/integration/` (11 de API + 9 de restricciones de la tabla `proyectos` y consultas). Corren contra una base `..._test` en el puerto 3307, separada de desarrollo (ver `docs/08-pruebas/plan-de-pruebas.md`). Resultado de esta auditoría: **20/20 pasan**. Nota: en esta auditoría se ejecutaron contra MariaDB; el CI/entorno oficial usa MySQL 8.0.42 (`docker-compose.test.yml`).

## 6. Muestra de casos distintos (comportamiento verificado)

- Registro público fuerza el rol Aprendiz; solo el Administrador crea Instructores/Administradores.
- Login bloquea tras 5 intentos fallidos (rate limit) y devuelve errores de validación por campo.
- Recuperación de contraseña: código de 6 dígitos, vencimiento de 3 min, máx. 5 intentos, uso único.
- Un Instructor solo ve/gestiona sus proyectos; el Administrador supervisa pero no crea estructura operativa.
- Fechas de entregables: no se aceptan pasadas ni fuera del rango de la fase.
- Mensajes: el filtro de lenguaje rechaza términos prohibidos.
- Notificaciones en tiempo real por WebSocket y respaldo SSE.
- Borrar una fase o entregable con registros hijos responde 409 (no 500).
- Frontend: formularios con etiquetas accesibles, paginación, filtros, modales de confirmación y estados vacíos.

## 7. Cómo reproducir

```bash
cd backend  && pnpm install --frozen-lockfile && pnpm test
cd ../frontend && pnpm install --frozen-lockfile && pnpm test
```
