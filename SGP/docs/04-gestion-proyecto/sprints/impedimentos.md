# Registro de Impedimentos – Sistema G.P.S SENA
**Proyecto:** Sistema de Gestión de Proyectos SENA  
**Trimestre:** T4 · 2026 · ADSO

---

## Impedimento 1 – Deuda técnica en el esquema de base de datos

| Campo | Detalle |
|-------|---------|
| **Fecha de detección** | 2026-04-10 |
| **Fecha de resolución** | 2026-04-12 |
| **Reportado por** | Rubiel Rodriguez (Backend) |
| **Tipo** | Deuda técnica |
| **Sprint afectado** | Sprint 1 |

### Descripción
El DDL inicial del sistema (`DDL.md`) fue diseñado con tablas mínimas que solo contenían IDs y llaves foráneas, sin atributos de negocio reales. Esto bloqueó el avance del desarrollo backend porque no era posible construir la lógica de consultas ni los endpoints de la API con un esquema vacío. Por ejemplo, la tabla `proyectos` no tenía campos como `nombre`, `descripcion`, `estado`, `fecha_inicio`, `porcentaje_avance`, que son fundamentales para el funcionamiento del sistema.

### Impacto
- Retrasó la construcción de la API REST en aproximadamente 2 semanas.
- Obligó a rehacer el esquema completo antes de continuar con el desarrollo.

### Cómo se resolvió
Se rediseñó el esquema completo de base de datos en el archivo `BASE_DE_DATOS_OFICIAL_CON_inserciones.sql`, agregando todos los atributos de negocio faltantes, restricciones `NOT NULL`, campos de auditoría (`fecha_registro`, `fecha_creacion`), y se incluyeron scripts `INSERT INTO` con datos de prueba para facilitar el desarrollo y las pruebas.

**Evidencia:** Commit `corecion de base de datos` – 2026-04-12  
**Archivo resultante:** `Docs/BASE_DE_DATOS_OFICIAL_CON_inserciones.sql`

---

## Impedimento 2 – UML incompleto respecto al modelo de dominio

| Campo | Detalle |
|-------|---------|
| **Fecha de detección** | 2026-03-23 |
| **Fecha de resolución** | 2026-06-04 |
| **Reportado por** | Juan Carlos Sanchez (QA) |
| **Tipo** | Documentación incompleta |
| **Sprint afectado** | Sprint 1 → Sprint 2 |

### Descripción
El archivo de modelado UML (`Docs/Modelado._Class_UML.puml`) estaba incompleto: no incluía todas las clases del sistema, los atributos no coincidían con el modelo de base de datos oficial, y faltaban las relaciones de herencia entre `Usuario`, `Aprendiz` e `Instructor`. Esto generó inconsistencias entre la documentación técnica y el esquema real de la BD.

### Impacto
- La documentación técnica no era coherente con el modelo de datos, lo que generaba confusión al momento de implementar los módulos.
- El archivo `.puml` quedó desactualizado sin posibilidad de generar un diagrama válido.

### Cómo se resolvió
Se rehízo la documentación UML completa clase por clase en la carpeta `Docs/---SUSTENTACION/002/`, organizada por módulos temáticos (`rol/`, `proyecto/`, `notificaciones/`). Cada clase tiene su propio archivo Markdown con tabla de atributos (visibilidad, nombre, tipo) y métodos, además de las relaciones documentadas en `TODOELUML.Md`.

**Evidencia:** Archivos en `Docs/---SUSTENTACION/002/` – commits del período 2026-04 a 2026-06  
**Archivos resultantes:** `Docs/---SUSTENTACION/002/TODOELUML.Md` y subcarpetas

---

## Impedimento 3 – Conflicto de integración frontend–backend (en curso)

| Campo | Detalle |
|-------|---------|
| **Fecha de detección** | 2026-06-04 |
| **Fecha de resolución** | Pendiente – T5 |
| **Reportado por** | Juan Manuel Arcila (Frontend) |
| **Tipo** | Conflicto de integración |
| **Sprint afectado** | Sprint 2 |

### Descripción
Al incorporar el proyecto React/Vite al repositorio (`add Frontend Proyecto` – 2026-06-04), se detectó que las pantallas HTML funcionales construidas en `Docs/HTML_BASES/` (Admin, Aprendiz, Instructor) no están integradas al proyecto React. El archivo `Frontend/src/App.jsx` contiene únicamente el template por defecto de Vite, sin ninguna pantalla del sistema implementada. La API REST está completamente documentada pero no tiene llamadas desde el frontend.

### Impacto
- El sistema no es funcional de extremo a extremo: existe BD, existe API documentada y existen pantallas HTML, pero no están conectadas entre sí.
- No se puede hacer una demo en vivo del flujo completo del sistema.

### Plan de mitigación (T5)
1. Migrar las pantallas HTML base de `Docs/HTML_BASES/` a componentes React en `Frontend/src/components/`.
2. Implementar el cliente HTTP (Axios o Fetch) para conectar los componentes con la API REST.
3. Implementar el módulo de autenticación JWT en el frontend (login, manejo de token, rutas protegidas).
4. Priorizar los módulos de mayor valor: Dashboard, Proyectos y Tareas.

**Evidencia:** `Frontend/src/App.jsx` (template Vite sin modificar), `Docs/API_REST_SENA_FINAL.md` (API documentada sin consumir)
