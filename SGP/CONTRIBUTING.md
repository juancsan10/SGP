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

- `main` — únicamente código verificado y funcional. Nunca se hace push directo aquí.
- `develop` — integración de features antes de pasar a main.
- `feature/<nombre-descriptivo>` — una rama por tarea/historia de usuario. Ejemplo: `feature/recuperacion-contrasena`.

Todo cambio a `main` o `develop` debe llegar vía **Pull Request**, no vía push directo.
