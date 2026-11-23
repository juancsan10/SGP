# Sprints 3 a 6 — resumen, tareas y retrospectiva

> Los objetivos, historias y puntos están detallados en `../backlog-puntuado.md`. Fechas tomadas del tablero de GitHub Projects y validadas contra la evidencia del repositorio (desarrollo de HU-13 a HU-35 entre agosto y noviembre de 2026; 121 commits desde 2026-10-01, 16 PRs fusionados).

| Sprint | Fechas | Resultado | Evidencia |
|---|---|---|---|
| **3 — Acceso seguro** | 2026-08-10 → 2026-09-30 | Registro, login con JWT/bcrypt/rate limit, roles (13 pts) | `auth.*`, `auth.middleware`, pruebas `auth.*.test.js` |
| **4 — Núcleo de seguimiento** | 2026-10-01 → 2026-10-21 | Proyectos, equipos, fases, entregables, tareas, calificación (42 pts) | controladores y 313 pruebas backend |
| **5 — Colaboración** | 2026-10-22 → 2026-11-11 | Mensajes, tiempo real, reuniones, alertas, recuperación HU-16 (39 pts) | PRs #16, #20, #22, #25; `realtime.service`, WebSocket/SSE |
| **6 — Integraciones y reportes** | 2026-11-12 → 2026-11-20 | Integración BD real, pruebas E2E, GitHub parcial, archivos (21 pts) | PRs #27, #28, #29; `docs/07-deuda-tecnica.md` |

## Retrospectiva (hallazgos reales del repositorio)
**Qué funcionó:** 
- Ruleset con PR + 1 aprobación obligatoria + checks de CI (`frontend` y `backend`) siempre en verde.
- Rotación semanal de capas en pruebas unitarias y E2E.
- Adopción estricta de Conventional Commits (119 de 121 commits desde octubre).
- Auditoría automatizada de vulnerabilidades con `pnpm audit` en el pipeline de GitHub Actions.

**Qué mejorar:**
1. Un merge destructivo sobre `develop` durante HU-16 obligó a restaurar la rama $\rightarrow$ siempre revisar el diff completo del PR antes de fusionar y no subir proyectos completos en formato comprimido.
2. Fallos de CI por dependencias con vulnerabilidades acumuladas $\rightarrow$ ejecutar `pnpm audit` semanalmente en local y no esperar al pipeline del PR.
3. Presencia de ramas obsoletas o fusionadas en el remoto (`STG`, `chore/deps-audit`, `feature/HU-35-Exportacion-de-reportes`) $\rightarrow$ archivar o eliminar inmediatamente tras la integración.
4. Commits con autor genérico o asistentes $\rightarrow$ estandarizar el uso de `Co-authored-by:` en el pie del commit (ver `CONTRIBUTING.md`).

## Acciones de Mejora Acordadas

| # | Acción concreta | Responsable | Fecha de cumplimiento | Estado |
|---|---|---|---|---|
| 1 | Revisar exhaustivamente el diff completo en GitHub antes de aprobar o fusionar cualquier PR, bloqueando merges directos o cargas de archivos comprimidos. | Juan Manuel Arcila | 2026-11-12 | ✅ Implementado |
| 2 | Ejecutar y auditar dependencias semanalmente con `pnpm audit` en local para solventar parches de seguridad antes de los cortes de sprint. | Juan Carlos Sánchez | 2026-11-15 | ✅ Implementado |
| 3 | Limpieza y archivado de ramas obsoletas o integradas en el repositorio remoto (`STG`, `chore/deps-audit`, etc.). | Rubiel Rodríguez | 2026-11-18 | ✅ Implementado |
| 4 | Configurar la firma de autoría en Git con nombre completo y asociar `Co-authored-by` en aportes asistidos por IA. | Juan Manuel Arcila | 2026-11-14 | ✅ Implementado |
