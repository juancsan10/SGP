# Retroalimentación del equipo, división del trabajo y asignación de tareas

## 1. Integrantes y rol principal
| Integrante | GitHub | Rol de coordinación | Capas (rotación) |
|---|---|---|---|
| Rubiel Rodríguez | @Rubloxil | Líder técnico y de despliegue / documentación | Backend, E2E |
| Juan Manuel Arcila | @JuanArcila1 | Coordinación de Frontend e Integración UI | Front, API, E2E |
| Juan Carlos Sánchez | @juancsan10 | Calidad y pruebas | Front, E2E, CI |

*(Roles de coordinación confirmados por el equipo; las capas corresponden a la rotación registrada en `docs/matriz-rotacion.md`.)*

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

Lectura honesta: Juan Carlos aparece con tres identidades (37 commits en total) y Juan Manuel con dos (14 commits verificados: identidades `JuanArcila1` y `Juan Manuel Arcila`). Los 24 commits de "Claude" ocultan quién los pidió o revisó; desde la semana 6 se estandarizó el uso de `Co-authored-by:` con el integrante responsable (ver `CONTRIBUTING.md`). La matriz de rotación incluye las entradas de Juan Manuel en S6 y S7 vinculadas a sus respectivos PRs.
Reproducir: `git shortlog -sn --since=2026-10-01`.

## 5. Retroalimentación (completada individualmente por cada integrante)
Cada persona escribe, en primera persona, 3 viñetas por punto y firma con su nombre. No se rellena por otra persona.

| Pregunta | Rubiel | Juan Manuel | Juan Carlos |
|---|---|---|---|
| ¿Qué aporté y qué aprendí? | • Aporté el backend (Node/Express, JWT, recuperación de contraseña con código de 6 dígitos), el modelo de base de datos en MySQL y el despliegue con Docker Compose.<br>• Aporté la documentación de los criterios de la rúbrica y la validación de variables de entorno al arrancar el backend.<br>• Aprendí a levantar entornos de prueba aislados (BD `_test` en Docker) y a auditar seguridad de la API.<br>— *Rubiel Rodríguez*| • Aporté en el desarrollo de la interfaz de usuario en React, construyendo componentes clave como EntregasPage, modales de confirmación, filtrado y paginación.<br>• Aprendí a diseñar y ejecutar pruebas de componentes con Vitest y MSW, asegurando que los contratos simulados respondan exactamente igual al backend real.<br>• Aporté en la gestión y aprobación de Pull Requests del flujo Git (PR #22 a develop) y aprendí a automatizar pruebas end-to-end con Playwright y page objects.<br>— *Juan Manuel Arcila* | _pendiente_ |
| ¿Qué me costó o me bloqueó? | • Mantener la documentación de la API alineada con el código real, que cambiaba cada semana.<br>• Revisar y fusionar ramas concurrentes sin pisar el trabajo de los demás.<br>• Coordinar el despliegue en Docker (puertos, variables y volúmenes) entre las máquinas de los tres.<br>— *Rubiel Rodríguez* | • La falta de sincronización temprana entre los mensajes de error simulados en MSW y las respuestas reales del backend en Node.js, lo que generó falsos positivos en las primeras semanas.<br>• Los conflictos al sincronizar ramas concurrentes y la resolución de restauraciones en la rama develop tras integraciones complejas.<br>• La curva de aprendizaje en Playwright para evitar esperas arbitrarias (waitForTimeout) y apoyarme únicamente en selectores accesibles y aserciones web-first.<br>— *Juan Manuel Arcila* | _pendiente_ |
| ¿Qué le agradezco a cada compañero? | • A Juan Manuel Arcila por la interfaz en React y las pruebas de componentes y end-to-end con Playwright.<br>• A Juan Carlos Sánchez por el control de calidad y por las pruebas de integración y el CI.<br>• A ambos por las revisiones cruzadas de cada PR y por avisar a tiempo de los errores.<br>— *Rubiel Rodríguez* | • A Rubiel Rodríguez por su liderazgo técnico, la estructuración de la base de datos, el backend y el apoyo continuo con Docker y entornos de prueba.<br>• A Juan Carlos Sánchez por su rigurosidad en las pruebas de calidad (QA), la configuración del pipeline de CI y las alertas tempranas sobre inconsistencias en los requisitos.<br>• A ambos por la paciencia, el respeto y la retroalimentación constructiva durante las revisiones cruzadas de código en cada PR.<br>— *Juan Manuel Arcila* | _pendiente_ |
| ¿Qué cambiaría del trabajo en equipo? | • Generar la documentación de la API automáticamente (OpenAPI) en vez de escribirla a mano.<br>• Configurar la identidad de git de cada uno desde el primer día para que los commits queden a nombre de quien los hizo.<br>• Cerrar las ramas obsoletas al terminar cada sprint, no al final del proyecto.<br>— *Rubiel Rodríguez* | • Definir y validar formalmente los contratos de la API (OpenAPI/Swagger) antes de implementar el código de las pantallas para evitar retrabajos de integración.<br>• Mantener una sincronización local y de ramas más frecuente para evitar acumulación de cambios y discrepancias en los entornos.<br>• Consolidar desde el inicio la configuración de identidad en Git para garantizar la trazabilidad uniforme de todos los commits.<br>— *Juan Manuel Arcila* | _pendiente_ |

## 6. Acuerdos de mejora
1. Commits con autor propio y `Co-authored-by` cuando se trabaje con asistente.
2. Completar la matriz de rotación cada viernes.
3. Revisar el diff completo antes de fusionar (lección del merge de HU-16).
4. Cerrar o archivar ramas obsoletas después de cada sprint.
