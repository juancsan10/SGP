# Retroalimentación del equipo, división del trabajo y asignación de tareas

## 1. Integrantes y rol principal
| Integrante | GitHub | Rol de coordinación | Capas (rotación) |
|---|---|---|---|
| Rubiel Rodríguez | @Rubloxil | Líder técnico y de despliegue / documentación | Backend, E2E |
| Juan Manuel Arcila | @JuanArcila1 | Frontend | Front, API |
| Juan Carlos Sánchez | @juancsan10 | Calidad y pruebas | Front, E2E, CI |

(Roles de coordinación: confirmar con el equipo; las capas salen de `docs/matriz-rotacion.md`.)

## 2. División del trabajo
- **Por capa y semana:** rotación Front → API → BD → E2E, sin repetir capa hasta pasar por todas (`docs/matriz-rotacion.md`, semanas S1–S9).
- **Por historia:** un responsable lidera cada HU y los otros dos revisan (`docs/04-gestion-proyecto/backlog-puntuado.md`).
- **Revisión:** quien aprueba un PR debe haber trabajado en otra capa esa semana. Nadie aprueba su propio PR (ruleset).
- **Flujo:** `feature/*` → PR → `test`/`develop` → `main`, con checks `frontend` y `backend` obligatorios.

## 3. Asignación de tareas
Tablero de GitHub Projects (columnas Backlog → Sprint → En curso → Revisión → Hecho), una tarjeta por tarea con responsable, etiqueta de capa y HU. Plantilla de PR en `.github/pull_request_template.md`. Reunión semanal de 30 min: avances, impedimentos (`sprints/impedimentos.md`) y asignación de la semana siguiente.

## 4. Evidencia objetiva de contribución (git, desde 2026-10-01)
| Autor en git | Commits |
|---|---|
| Rubiel Rodríguez | 46 |
| Juan Carlos Sánchez (cuenta sanchezaguirrejuancarlos800-cpu) | 30 |
| "Claude" (asistente, commits hechos en nombre del equipo) | 24 |
| Juan Manuel Arcila | 12 |
| juancsan10 | 4 |
| juan carlos sanchez (otra configuración de git) | 3 |
| JuanArcila1 | 2 |

Lectura honesta: Juan Carlos aparece con tres identidades (37 commits en total) y Juan Manuel con dos (14). Los 24 commits de "Claude" ocultan quién los pidió o revisó; desde ahora se usa `Co-authored-by:` con el integrante responsable (ver `CONTRIBUTING.md`). Además, la matriz de rotación no tiene entradas de Juan Manuel en S6–S7: debe completarse.
Reproducir: `git shortlog -sn --since=2026-10-01`.

## 5. Retroalimentación (plantilla a completar por cada integrante)
Cada persona escribe, en primera persona, 3 viñetas por punto y firma con su nombre. No se rellena por otra persona.

| Pregunta | Rubiel | Juan Manuel | Juan Carlos |
|---|---|---|---|
| ¿Qué aporté y qué aprendí? | _pendiente_ | _pendiente_ | _pendiente_ |
| ¿Qué me costó o me bloqueó? | _pendiente_ | _pendiente_ | _pendiente_ |
| ¿Qué le agradezco a cada compañero? | _pendiente_ | _pendiente_ | _pendiente_ |
| ¿Qué cambiaría del trabajo en equipo? | _pendiente_ | _pendiente_ | _pendiente_ |

## 6. Acuerdos de mejora
1. Commits con autor propio y `Co-authored-by` cuando se trabaje con asistente.
2. Completar la matriz de rotación cada viernes.
3. Revisar el diff completo antes de fusionar (lección del merge de HU-16).
4. Cerrar o archivar ramas obsoletas después de cada sprint.
