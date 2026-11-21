# Sprints 3 a 6 — resumen, tareas y retrospectiva

> Los objetivos, historias y puntos están detallados en `../backlog-puntuado.md`. Las fechas exactas por sprint **las debe completar el equipo** con las de su tablero; aquí solo se usan hechos verificables del repositorio (el desarrollo de HU-13 a HU-35 ocurre entre septiembre y noviembre de 2026; 121 commits desde 2026-10-01, 16 PRs fusionados).

| Sprint | Resultado | Evidencia |
|---|---|---|
| 3 — Acceso seguro | Registro, login con JWT/bcrypt/rate limit, roles | `auth.*`, `auth.middleware`, pruebas `auth.*.test.js` |
| 4 — Núcleo de seguimiento | Proyectos, equipos, fases, entregables, tareas, calificación | controladores y 313 pruebas backend |
| 5 — Colaboración | Mensajes, tiempo real, reuniones, alertas, recuperación (HU-16) | PRs de HU-16, HU-25, HU-28; `realtime.service` |
| 6 — Integraciones y reportes | GitHub parcial, archivos (volumen), exportación pendiente | `docs/07-deuda-tecnica.md` |

## Retrospectiva (hallazgos reales del repositorio)
**Qué funcionó:** ruleset con PR + 1 aprobación + checks obligatorios; rotación de capas en pruebas; Conventional Commits (119 de 121 desde octubre); `pnpm audit` en el CI.
**Qué mejorar:**
1. Un merge destructivo sobre `develop` (HU-16) obligó a restaurar la rama → siempre revisar el diff del PR antes de fusionar y no subir proyectos completos como zip.
2. Fallos de CI por dependencias vulnerables acumuladas → ejecutar `pnpm audit` semanalmente, no solo en el PR.
3. Ramas obsoletas (`STG`, `feature/HU-35`, `chore/deps-audit`) → archivar o borrar tras fusionar.
4. Commits con autor genérico → usar `Co-authored-by` (ver `CONTRIBUTING.md`).
**Acciones:** responsables y fechas a definir en la próxima retrospectiva.
