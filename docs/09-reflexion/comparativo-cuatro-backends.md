# Reflexión comparativa de los 4 backends

**Estado:** solo la columna **SGP (Node/Express)** tiene datos reales. Las otras tres columnas son una plantilla para que el equipo las complete con los backends que construyó en los ejercicios (por ejemplo FastAPI, mencionado en la descripción del proyecto) y con lo que realmente vivió; no se inventaron valores.

## 1. Cuadro comparativo
| Criterio | **SGP — Node 20 + Express 4** | Backend 2 | Backend 3 | Backend 4 |
|---|---|---|---|---|
| Lenguaje / framework | JavaScript / Express | _completar_ | _completar_ | _completar_ |
| Base de datos y acceso | MySQL 8.0.42, `mysql2` con consultas SQL parametrizadas (sin ORM) | _completar_ | _completar_ | _completar_ |
| Autenticación | JWT + bcryptjs, roles, rate limit | _completar_ | _completar_ | _completar_ |
| Validación de entrada | express-validator (+ validación manual) | _completar_ | _completar_ | _completar_ |
| Documentación de la API | Markdown manual (`docs/03-api/api-rest.md`); sin OpenAPI/Swagger | _completar_ | _completar_ | _completar_ |
| Pruebas | Vitest: 313 unitarias + 20 de integración; cobertura ≈ 76 % líneas | _completar_ | _completar_ | _completar_ |
| Tiempo real | WebSocket (`ws`) + SSE de respaldo | _completar_ | _completar_ | _completar_ |
| Despliegue | Docker Compose (nginx + node + mysql) | _completar_ | _completar_ | _completar_ |
| Tamaño aproximado | 21 archivos de rutas, 21 controladores, 28 archivos de prueba; todo bajo `/api/v1` | _completar_ | _completar_ | _completar_ |
| Mayor ventaja | Mismo lenguaje que el frontend; ecosistema npm; control total del SQL | _completar_ | _completar_ | _completar_ |
| Mayor dificultad | Sin tipos ni OpenAPI: el contrato se desactualizó (`api-rest.md`); validación repartida en varios lugares | _completar_ | _completar_ | _completar_ |

## 2. Reflexión (guía para redactar; cada integrante añade su párrafo)
- ¿Qué decisión de arquitectura repetirían y cuál cambiarían? En SGP: repetir la separación rutas → controladores → servicios y los hashes HMAC en la recuperación; cambiar la documentación manual por OpenAPI generado y centralizar validaciones.
- ¿Qué aprendimos de comparar enfoques (rapidez de arranque, seguridad por defecto, pruebas)?
- ¿Cuál elegiríamos para un siguiente proyecto y por qué?

Párrafos: Rubiel _pendiente_ · Juan Manuel _pendiente_ · Juan Carlos _pendiente_

## 3. Deuda técnica priorizada
La lista priorizada (Alta/Media/Baja con impacto, esfuerzo y responsable) está en `docs/07-deuda-tecnica.md`.
