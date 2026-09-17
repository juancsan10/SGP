# Historias de usuario — SGP SENA

| ID | Historia | Trazabilidad |
|---|---|---|
| HU-01 | Como usuario quiero registrarme para acceder al sistema como Aprendiz. | RF1.1 / RN-008 |
| HU-02 | Como usuario quiero iniciar sesión de forma segura para consultar mis proyectos. | RF1.2 |
| HU-03 | Como Administrador quiero gestionar roles y usuarios para controlar el acceso. | RF1.3 |
| HU-04 | Como usuario quiero recuperar mi contraseña mediante un enlace temporal para volver a acceder. | RF1.4 |
| HU-05 | Como Instructor quiero crear proyectos para organizar el trabajo formativo. | RF2.1 / RN-004, RN-011 |
| HU-06 | Como Instructor quiero asignar integrantes para conformar el equipo. | RF2.2 / RN-001 |
| HU-07 | Como equipo quiero gestionar entregables por fase para controlar las entregas. | RF2.3 / RN-019 |
| HU-08 | Como Administrador quiero consultar el historial para auditar cambios. | RF2.4 / RN-026 |
| HU-09 | Como usuario quiero consultar el estado y avance del proyecto. | RF2.5 / RN-013, RN-014 |
| HU-10 | Como usuario quiero consultar progreso, calendario y línea de tiempo para hacer seguimiento. | RF3.1, RF5.3, RF5.4 |
| HU-11 | Como usuario quiero consultar la trazabilidad de cambios para conocer la evolución. | RF3.2 |
| HU-12 | Como Instructor quiero calificar entregables en revisión y dejar retroalimentación. | RF3.3 / RN-015, RN-016 |
| HU-13 | Como usuario quiero recibir alertas antes de un vencimiento. | RF3.4 / RN-023 |
| HU-14 | Como usuario quiero enviar mensajes dentro del proyecto para coordinar el trabajo. | RF4.1, RF4.3 |
| HU-15 | Como usuario quiero comentar entregables para intercambiar retroalimentación. | RF4.2 / RN-015 |
| HU-16 | Como usuario quiero recibir notificaciones de asignaciones y reuniones. | RF4.4 / RN-021 |
| HU-17 | Como Instructor quiero asignar tareas a integrantes para distribuir el trabajo. | RF5.1 / RN-017 |
| HU-18 | Como usuario quiero actualizar el estado de mis tareas para informar el avance. | RF5.2 |
| HU-19 | Como usuario quiero consultar repositorios del proyecto para dar seguimiento al código. | RF6.1 |

## Criterios de aceptación generales
- La acción exige autenticación cuando el requisito lo requiere.
- El backend valida autorización por rol y pertenencia al proyecto.
- Los datos se validan antes de persistirse.
- Las mutaciones relevantes quedan registradas en `historial_cambios`.
- Los errores internos no exponen mensajes de la base de datos al cliente.
