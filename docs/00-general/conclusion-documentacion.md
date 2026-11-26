# Conclusión de la documentación — SGP SENA

Este documento cierra la documentación general: resume qué se construyó, indica dónde está cada artefacto (diagramas, modelos, casos de uso) y deja explícito qué falta.

## 1. Qué es el sistema
Aplicación web para gestionar y dar seguimiento a los proyectos formativos del SENA con tres roles (Administrador, Instructor, Aprendiz). Pila: React 18 + Vite, Node 20 + Express, MySQL 8.0.42, Docker Compose, pruebas con Vitest y Playwright.

## 2. Mapa de artefactos
| Artefacto | Ubicación | Estado |
|---|---|---|
| Requisitos funcionales y no funcionales | `docs/01-requisitos/rf-rnf/` | ✅ |
| Reglas de negocio | `docs/01-requisitos/reglas-negocio/` | ✅ |
| Casos de uso | `docs/01-requisitos/casos-de-uso/casos-de-uso.md` | ✅ |
| Historias de usuario HU-13 a HU-35 | `docs/01-requisitos/historias-usuario/` | ✅ |
| Matriz de trazabilidad RF→RN→CU→HU→endpoint | `docs/01-requisitos/matriz-trazabilidad.md` | ✅ |
| Modelo entidad-relación (MER/DER) | `docs/02-arquitectura/diagramas/der.drawio`, `der.webp` | ✅ |
| Modelo relacional (26 tablas) | `database/docker-init/001_schema.sql`, `docs/02-arquitectura/modelo-datos/documentacion-base-datos.md` | ✅ |
| Entidades y cardinalidades | `docs/02-arquitectura/modulos-er/` | ✅ |
| Diagrama de clases UML | `docs/02-arquitectura/diagramas/modelo-clases-uml.puml`, `.webp` | ✅ |
| Diagrama de arquitectura | `docs/02-arquitectura/diagramas/arquitectura.svg` | ✅ nuevo |
| Diagrama de despliegue y CI | `docs/02-arquitectura/diagramas/despliegue.svg` | ✅ nuevo |
| API REST | `docs/03-api/api-rest.md` | ✅ actualizada |
| Scrum: backlog, sprints, estimación | `docs/04-gestion-proyecto/` | 🟡 estimaciones propuestas |
| Equipo y retroalimentación | `docs/05-equipo/feedback-equipo.md` | 🟡 partes personales pendientes |
| Seguridad | `docs/06-seguridad/` | ✅ |
| Deuda técnica priorizada | `docs/07-deuda-tecnica.md` | ✅ |
| Plan, informe y reporte de pruebas | `docs/08-pruebas/` | ✅ |
| Comparativo de backends | `docs/09-reflexion/` | 🟡 plantilla |

## 3. Resultados
- 23 historias (HU-13 a HU-35): 21 hechas y 2 parciales (GitHub, archivos en nube).
- 672 pruebas unitarias y 20 de integración pasando; cobertura de líneas ≈ 76 %; sin vulnerabilidades altas ni críticas en dependencias.
- Seguridad: JWT + bcrypt, roles verificados en el backend, rate limit en login y recuperación, códigos con hash HMAC, validación de entradas.

## 4. Limitaciones conocidas
Ver `docs/07-deuda-tecnica.md`: cifrado del token de GitHub, TLS institucional, JWT en localStorage, exportación de reportes, pruebas de integración y E2E fuera del CI, y el bono de IoT sin construir.

## 5. Conclusiones
1. Se pasó de información dispersa a una plataforma única Usuarios → Fichas → Proyectos → Actividades → Entregables → Evaluaciones → Seguimiento.
2. La trazabilidad requisito → historia → endpoint → prueba permite verificar cada afirmación con evidencia del repositorio.
3. El control de calidad (PR con aprobación, checks obligatorios, `pnpm audit`, rotación de pruebas) evitó que defectos llegaran a `main`; el incidente del merge de HU-16 mostró que falta revisar el diff completo antes de fusionar.
4. Lo siguiente con más valor es cerrar las deudas de prioridad alta antes de usar el sistema con datos reales.
