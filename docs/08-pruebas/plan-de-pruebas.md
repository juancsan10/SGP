# Plan de pruebas — SGP SENA

**Versión:** 1.0 · **Fecha:** 2026-11-20 · **Responsables:** Rubiel Rodríguez, Juan Manuel Arcila, Juan Carlos Sánchez (rotación de capas: `docs/matriz-rotacion.md`)

## 1. Objetivo
Verificar de forma repetible y automatizada que SGP SENA cumple sus requisitos (RF/RNF, reglas de negocio e historias de usuario HU-13 a HU-35 — ver `docs/01-requisitos/matriz-trazabilidad.md`), detectar defectos temprano y evitar regresiones antes de integrar a `develop` y `main`.

## 2. Alcance
**Dentro del alcance**
- Autenticación, roles y permisos (Administrador, Instructor, Aprendiz).
- Recuperación de contraseña (código de 6 dígitos, 3 min, 5 intentos).
- Proyectos, equipos, fases, entregables, tareas/entregas, comentarios, evaluaciones, reuniones.
- Mensajes (con filtro de lenguaje), notificaciones (WebSocket y SSE), solicitudes al administrador, historial, calendario y línea de tiempo.
- Validaciones de entrada, códigos HTTP y mensajes de error de la API.
- Interfaz React: formularios, paginación, filtros, accesibilidad básica (etiquetas, `role=alert`), estados vacíos y de error.

**Fuera del alcance (documentado como deuda técnica)**
- Pruebas de carga/rendimiento y de penetración.
- Integración con GitHub (HU-33, parcial).
- Pruebas en navegadores distintos de Chromium y en dispositivos móviles reales.
- Envío real de correo por SMTP (se prueba el modo consola y la lógica; el SMTP real requiere credenciales).

## 3. Niveles de prueba

| Nivel | Qué prueba | Herramienta | Dónde vive | Cómo se ejecuta | En el CI |
|---|---|---|---|---|---|
| Unitaria — backend | Controladores, middlewares, validadores y servicios con `db.query` simulado | Vitest | `backend/tests/*.test.js` | `cd backend && pnpm test` | Sí (`tests.yml`) |
| Unitaria — frontend | Componentes y páginas, cliente HTTP (con MSW), utilidades | Vitest + Testing Library | `frontend/tests/` | `cd frontend && pnpm test` | Sí |
| Integración API + BD | Rutas reales contra MySQL, restricciones de tablas y consultas | Vitest + Supertest | `backend/tests/integration/` | `pnpm test:integration` con `DATABASE_URL` | No todavía (previsto semana 8) |
| E2E | Flujos críticos en navegador: login, instructor crea proyecto, aprendiz entrega una tarea, estados del API | Playwright | `e2e/tests/` | `cd e2e && pnpm test` | No (se corre en local) |
| Estática / calidad | Vulnerabilidades de dependencias, compilación | `pnpm audit --audit-level=high`, `vite build` | `.github/workflows/ci.yml` | automática en cada PR | Sí |
| Manual exploratoria | Revisión visual por rol antes de cada PR | Navegador | — | checklist de la plantilla de PR | — |

## 4. Ambientes (el de pruebas está separado del de desarrollo)

| Ambiente | Base de datos | Puertos | Cómo se levanta |
|---|---|---|---|
| Desarrollo | MySQL `SistemaGestionProyectosSENA` (volumen persistente) | BD 3306 (solo red interna en producción), API 3000, front 5173 | `docker compose up -d --build` + `seed.js` |
| **Pruebas de integración** | MySQL 8.0.42 `SistemaGestionProyectosSENA_test` en **tmpfs** (se pierde al apagar) | BD **3307** | `docker compose -f docker-compose.test.yml up -d --wait` |
| Pruebas unitarias | Sin BD (stubs) | — | `pnpm test` |
| CI | Sin BD (unitarias) en GitHub Actions, Node 20 y pnpm 9.15.0 | — | automático |

Reglas de aislamiento: los tests de integración **se niegan a correr** si el nombre de la base no termina en `_test`; cada test limpia con `TRUNCATE` y crea sus propios datos; ninguna credencial se escribe en los tests (llega por `DATABASE_URL`).

## 5. Datos de prueba
- Desarrollo: `backend/database/seed.js` (13 usuarios, 7 proyectos, tareas, entregables y repositorios; contraseña de demo `Sena2026*`). Fechas relativas a "hoy" para que no caduquen.
- Pruebas: cada test crea su propio dato mínimo; no se usan datos reales.

## 6. Criterios de entrada y de salida
**Entrada (antes de probar):** rama actualizada con `develop`; `pnpm install --frozen-lockfile` sin errores.
**Salida (para fusionar un PR):**
1. Todas las pruebas pasan (0 fallos, 0 omitidas sin justificación).
2. La cobertura no baja de los umbrales de `vitest.config.mjs` (backend) y `vite.config.js` (frontend); el umbral solo sube.
3. `pnpm audit --audit-level=high` sin vulnerabilidades altas ni críticas; `vite build` compila.
4. 1 aprobación de un revisor que trabajó en otra capa esa semana.
5. Defectos abiertos de severidad Crítica o Alta: ninguno (ver `reporte-ejecucion-y-defectos.md`).

## 7. Gestión de defectos
Cada defecto se registra con ID, módulo, descripción, severidad, estado y commit de corrección en `docs/08-pruebas/reporte-ejecucion-y-defectos.md`. Escala de severidad: **Crítica** (pérdida de datos, fallo de seguridad explotable o sistema caído), **Alta** (flujo principal falla o se exponen detalles internos), **Media** (comportamiento incorrecto con alternativa, o error de validación), **Baja** (accesibilidad menor o cosmético). Estados: Abierto → En corrección → Corregido → Verificado (cerrado) / Mitigado / Aceptado.

## 8. Cronograma (rotación por semanas)
| Semana | Foco | Estado |
|---|---|---|
| S1 | E2E de login (3 casos) | Hecha |
| S2 | API: permisos por rol y reglas de proyectos; front: validaciones, filtros y paginación; CI | Hecha |
| S3 | Front: EliminarUsuarioModal, EntregasPage, SolicitudesPanel | Hecha |
| S4 | E2E de seguridad/errores; API de proyectos; contrato del API | Hecha |
| S5 | Front: cliente HTTP con MSW y recuperación; E2E de estados | Hecha |
| S6 | API/BD: proyectos, equipos, fases, entregables contra BD real | Hecha |
| S7 | E2E: instructor crea proyecto, aprendiz entrega tarea; API de comentarios, evaluaciones, reuniones, repositorios | Hecha |
| S8–S9 | Integración en el CI, ampliar E2E y cobertura | Pendiente |

## 9. Riesgos y mitigación
| Riesgo | Mitigación |
|---|---|
| Tests de integración no corren en el CI | Incorporar `docker-compose.test.yml` al workflow (S8) |
| Límite de intentos de login interfiere con E2E | Variable `LOGIN_RATE_LIMIT_MAX` para el ambiente de pruebas |
| Diferencias MySQL/MariaDB | El ambiente oficial usa MySQL 8.0.42 |
| Dependencias con vulnerabilidades nuevas | `pnpm audit` en cada PR y actualización con versiones exactas |

## 10. Entregables de pruebas
Este plan · `informe-pruebas-unitarias.md` · `reporte-ejecucion-y-defectos.md` · reportes de cobertura de Vitest · reporte HTML de Playwright (`pnpm report`).
