# 🤝 Guía de contribución — SGP SENA

## Convención de commits (Conventional Commits)

A partir de este punto, todos los commits deben seguir el formato:

```
<tipo>: <descripción corta en minúscula, sin punto final>

[cuerpo opcional explicando el porqué, no el qué]
```

### Tipos permitidos

| Tipo | Cuándo usarlo | Ejemplo |
|---|---|---|
| `feat` | Nueva funcionalidad para el usuario | `feat: agregar módulo de reuniones` |
| `fix` | Corrección de un bug | `fix: corregir cálculo de porcentaje de avance` |
| `docs` | Cambios solo en documentación | `docs: agregar historias de usuario` |
| `style` | Formato, espacios, punto y coma (sin cambio de lógica) | `style: aplicar prettier a controllers` |
| `refactor` | Cambio de código que no arregla un bug ni agrega función | `refactor: extraer lógica de validación a helper` |
| `test` | Agregar o corregir pruebas | `test: agregar pruebas de auth.controller` |
| `chore` | Tareas de mantenimiento (dependencias, configuración) | `chore: migrar de npm a pnpm` |
| `perf` | Mejora de rendimiento | `perf: agregar índice a tabla proyectos` |

### Reglas

- **Un commit, un propósito.** Si estás arreglando un bug y además agregando una función, son dos commits.
- El **título va en minúscula** y sin punto final, en modo imperativo: "agregar", no "agregado" ni "agrega".
- Si el cambio afecta a un módulo específico, se puede indicar entre paréntesis: `feat(evaluaciones): validar rango 0-100`.
- Para cambios que rompen compatibilidad (breaking changes), agregar `!` después del tipo: `feat!: cambiar formato de respuesta de /usuarios`.

### Ejemplos tomados de este mismo repositorio (después de esta guía)

```
feat: completar módulos faltantes (comentarios, archivos, evaluaciones, reuniones, github-integration)
chore: migrar el gestor de paquetes de npm a pnpm
docs: agregar historias de usuario derivadas de los RF
chore: fijar versiones exactas de dependencias
```

## ⚠️ Sobre el historial de commits anterior

Los commits previos a esta guía (por ejemplo `agrego backend con node`,
`agrego frontend con react`) **no siguen esta convención** porque se
escribieron antes de adoptarla. **No se reescribió ese historial** a
propósito: hacerlo requiere `git rebase -i` + `push --force`, lo cual
reescribe los hashes de commit y puede romper el trabajo de cualquier
compañero que ya tenga esas ramas clonadas localmente. Si el equipo decide
igualmente limpiar el historial antes de la entrega final, debe hacerse
**en coordinación**, avisando a todos los integrantes para que vuelvan a
clonar después del `force-push`.

## Flujo de ramas

- `develop` — rama de trabajo diaria. Aquí se integran todas las features, fixes y tests.
- `STG` — pre-producción. Recibe `develop` cuando hay una presentación o una entrega para validar.
- `main` — producción. Recibe `STG` solo cuando lo validado está listo. Nunca se hace push directo aquí.
- Ramas de trabajo, siempre creadas **desde `develop`**:
  - `feature/<nombre-descriptivo>` — una historia de usuario. Ejemplo: `feature/HU-16-recuperacion-contrasena`.
  - `fix/<nombre>` — corrección de un bug.
  - `test/<nombre>` — pruebas.
  - `chore/<nombre>` — mantenimiento (dependencias, configuración).
  - `ci/<nombre>` — cambios en el CI.

Recorrido de un cambio: `rama de trabajo → develop → STG → main`.

Todo cambio a `develop`, `STG` o `main` debe llegar vía **Pull Request**, no vía push directo.

## Pull Requests

- Una PR por propósito, apuntando a `develop` (salvo los pases `develop → STG` y `STG → main`).
- Debe tener el CI en verde y la aprobación de **al menos un compañero** del equipo antes de hacer merge.
- Quien abre la PR no la aprueba ni la mergea sin la revisión de otra persona.
- Al abrir la PR se carga una plantilla (`.github/pull_request_template.md`); complétala.

## Integración continua (CI)

El workflow `.github/workflows/ci.yml` corre en cada PR y push hacia `develop`, `STG` y `main`:

- **backend:** instala dependencias con el lockfile y ejecuta `pnpm audit` (falla con vulnerabilidades altas o críticas).
- **frontend:** instala dependencias, compila (`pnpm build`) y ejecuta `pnpm audit`.

Si el audit falla, actualiza la librería afectada (`pnpm update <paquete>`) y sube el lockfile. Si no existe versión corregida, no lo ignores en silencio: explica el motivo en la PR.

## Dependencias

- Las versiones están fijadas de forma exacta en `package.json`; no uses `^` ni `~`.
- Usa siempre **pnpm** (versión 9.15.0), nunca `npm install`.
- Antes de subir cambios de dependencias, corre `pnpm audit` en `backend/` y `frontend/`.
