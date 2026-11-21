# Reporte de ejecución de pruebas y registro de defectos — SGP SENA

**Fecha:** 2026-11-20 · **Rama probada:** `semana-7` (commit `1c861ae`) · **Responsable del reporte:** equipo SGP SENA

> **Nota sobre las severidades:** se clasificaron con la escala del plan de pruebas (`plan-de-pruebas.md`, §7) a partir del mensaje y el efecto de cada commit de corrección. Es una propuesta: el equipo debe validarla y ajustarla donde no coincida con su criterio.

## 1. Reporte de ejecución

| # | Suite | Comando | Casos | Pasan | Fallan | Resultado |
|---|---|---|---|---|---|---|
| 1 | Unitarias backend | `cd backend && pnpm test` | 321 (29 archivos) | 321 | 0 | ✅ |
| 2 | Unitarias frontend | `cd frontend && pnpm test` | 313 (32 archivos) | 313 | 0 | ✅ |
| 3 | Integración API + BD | `pnpm test:integration` (BD `_test`, puerto 3307) | 20 (2 archivos) | 20 | 0 | ✅ (ejecutada sobre MariaDB; el ambiente oficial es MySQL 8.0.42) |
| 4 | Vulnerabilidades backend | `pnpm audit --audit-level=high` | — | — | — | ✅ sin altas/críticas |
| 5 | Vulnerabilidades frontend | `pnpm audit --audit-level=high` | — | — | — | ✅ sin altas/críticas |
| 6 | Compilación frontend | `pnpm build` | — | — | — | ✅ |
| 7 | E2E Playwright | `cd e2e && pnpm test` | 6 especificaciones | — | — | ⚪ No ejecutadas en esta auditoría (requieren Docker y navegador); se corren en local |

Cobertura: backend 75.6 % de líneas, frontend 75.55 % (detalle en `informe-pruebas-unitarias.md`).
Total de casos automatizados ejecutados en esta auditoría: **654** (634 unitarios + 20 de integración), **0 fallos**.

## 2. Resumen de defectos

| Severidad | Cantidad |
|---|---|
| Crítica | 0 |
| Alta | 4 |
| Media | 13 |
| Baja | 8 |
| **Total registrado** | **25** |

Estados: 19 corregidos y verificados con pruebas · 2 mitigados · 2 corregidos en esta rama (pendientes de verificación) · 2 abiertos.

## 3. Defectos corregidos (correcciones `fix:` del historial, 2026-10-28 a 2026-11-19)

| ID | Módulo | Descripción | Severidad | Estado | Commit (fecha) | Corrigió |
|---|---|---|---|---|---|---|
| DEF-01 | Login | El campo contraseña no tenía nombre accesible (lectores de pantalla) | Baja | Corregido y verificado | `f4f2c90` (2026-10-28) | Rubiel Rodríguez |
| DEF-02 | Usuarios | Modal de eliminar usuario sin etiquetas asociadas ni `role=alert` | Baja | Corregido y verificado | `c4071ef` (2026-10-30) | Rubiel Rodríguez |
| DEF-03 | API | Un JSON mal formado respondía 500 y los errores 500 mostraban detalles internos | Alta | Corregido y verificado | `461eb57` (2026-10-30) | Rubiel Rodríguez |
| DEF-04 | Proyectos | RN-004: la duración del proyecto no contaba meses de calendario | Media | Corregido y verificado | `8bd59fc` (2026-10-30) | Rubiel Rodríguez |
| DEF-05 | Proyectos | Formulario «Nuevo proyecto» con etiquetas sin asociar | Baja | Corregido y verificado | `6c7ae0f` (2026-11-02) | Juan Carlos Sánchez |
| DEF-06 | Solicitudes | Panel de solicitudes sin etiquetas asociadas ni `role=alert` | Baja | Corregido y verificado | `9838f67` (2026-11-02) | Juan Carlos Sánchez |
| DEF-07 | Login | El login no mostraba el detalle de los errores de validación | Media | Corregido y verificado | `ce1c70d` (2026-11-02) | Juan Carlos Sánchez |
| DEF-08 | Recuperación (HU-16) | Se quitaban los puntos de correos Gmail al verificar y confirmar, y el código no coincidía | Alta | Corregido y verificado | `388b565` (2026-11-02) | Claude (asistente) |
| DEF-09 | Notificaciones | Modal de notificaciones y textos del menú lateral contraído mal presentados | Baja | Corregido y verificado | `568b667` (2026-11-03) | juancsan10 |
| DEF-10 | Usuarios | Se podía crear un instructor sin validar la cédula | Media | Corregido y verificado | `7eb4d4c` (2026-11-03) | Juan Manuel Arcila |
| DEF-11 | Entregas | El aprendiz no podía entregar su tarea (se comparaba con el campo de id equivocado) | Alta | Corregido y verificado | `6272ee3` (2026-11-03) | Juan Manuel Arcila |
| DEF-12 | Notificaciones | Formulario «Nueva notificación» sin etiquetas ni `role=alert` | Baja | Corregido y verificado | `e9842c6` (2026-11-03) | Rubiel Rodríguez |
| DEF-13 | API | Si el aviso fallaba después de guardar, la API respondía error aunque el dato ya estaba guardado (riesgo de duplicados) | Media | Corregido y verificado | `2026a0d` (2026-11-04) | Juan Carlos Sánchez |
| DEF-14 | Interfaz | Con «reducir movimiento» el contador animado no mostraba el número final al instante | Baja | Corregido y verificado | `a25cda5` (2026-11-06) | Claude (asistente) |
| DEF-15 | Proyectos | Se aceptaba un instructor inexistente o que no era instructor, y fechas imposibles | Media | Corregido y verificado | `61e739c` (2026-11-19) | Rubiel Rodríguez |
| DEF-16 | Fases / Entregables | Borrar una fase o entregable con registros hijos respondía 500 en vez de 409 | Media | Corregido y verificado | `74feceb` (2026-11-19) | Rubiel Rodríguez |
| DEF-17 | Entregables | La fecha de entrega se comparaba con «hoy» en UTC y no en la zona horaria local | Media | Corregido y verificado | `06e9f37` (2026-11-19) | Juan Carlos Sánchez |
| DEF-18 | Reuniones | Si fallaba el aviso a los integrantes, la reunión creada no respondía 201 | Media | Corregido y verificado | `1e95a75` (2026-11-19) | Rubiel Rodríguez |
| DEF-19 | Entregas | El formulario se podía editar mientras cargaba la entrega y se perdía lo escrito | Media | Corregido y verificado | `86c0ad8` (2026-11-19) | Juan Carlos Sánchez |

## 4. Defectos y hallazgos abiertos o mitigados

| ID | Módulo | Descripción | Severidad | Estado | Acción |
|---|---|---|---|---|---|
| DEF-20 | Seguridad (SEC-06) | El `github_token` no se cifra en la base de datos (no se devuelve en respuestas) | Alta | Abierto | Cifrar con AES-256-GCM antes de producción |
| DEF-21 | Seguridad (SEC-08) | JWT guardado en localStorage del navegador | Media | Mitigado | Migrar a cookie httpOnly (deuda técnica) |
| DEF-22 | Seguridad (SEC-13) | TLS no configurado dentro del proyecto | Media | Mitigado | Delegado al proxy institucional; documentar certificado |
| DEF-23 | Despliegue Docker | `frontend/nginx.conf` no tenía proxy para `/ws` (tiempo real en Docker) | Media | Corregido en esta rama; verificar en Docker | Se añadió `location /ws` y SSE sin buffer |
| DEF-24 | Documentación | `docs/03-api/api-rest.md` sin solicitudes, `/verify`, WebSocket ni SSE | Baja | Corregido en esta rama | API documentada al día |
| DEF-25 | Funcionalidad | HU-35 exportar reportes sin implementar; HU-33 y HU-34 parciales | Media | Abierto | Ver `docs/07-deuda-tecnica.md` |

## 5. Cómo se mantiene este registro
Cada `fix:` que se fusione agrega una fila aquí (ID siguiente, severidad, commit). Los hallazgos de seguridad se siguen también en `docs/06-seguridad/hallazgos.md`. Cada defecto abierto debe tener un issue en GitHub con etiqueta `bug` y su severidad (`sev-critica`, `sev-alta`, `sev-media`, `sev-baja`).
