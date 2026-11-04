# 📋 Backlog para GitHub Projects — SGP SENA

**Corte de revisión:** 16 de octubre de 2026  
**Fuente:** historias de usuario, matriz de trazabilidad, backlog previo y captura compartida del tablero GitHub Projects.

Este documento concilia el estado del backlog con la evidencia compartida. No reemplaza las pruebas técnicas: un estado `Done` en el tablero no demuestra por sí solo que la funcionalidad cumpla todos los criterios de aceptación.

## Criterios de estado

- **Hecho (validado):** criterios de aceptación comprobados y evidencia de prueba disponible.
- **En pruebas:** la implementación requiere validación funcional/manual antes de cerrarse.
- **En progreso:** falta completar parte del requisito.
- **Por verificar:** el tablero y la documentación se contradicen o la tarjeta no se ve completa en la captura.
- **Pendiente:** todavía no existe una implementación suficiente.

> **Importante:** la captura muestra 21 elementos en `Done`, 3 en `In Progress`, 2 en `Tests` y 0 en `Todo`. La columna `Done` tiene desplazamiento y no se alcanzan a leer todos sus elementos. La captura permite identificar HU-25, HU-33 y HU-35 en `In Progress`, HU-16 en `Tests`, y HU-28/HU-32 en `Done`. No se deben inventar estados para tarjetas que no se distinguen.

---

## 1. En pruebas

| HU | Título | Validación requerida |
|---|---|---|
| HU-16 | Recuperación de contraseña | La matriz de trazabilidad menciona `/auth/password-reset/request` y `/auth/password-reset/confirm`, pero el backlog anterior decía que no existían. Probar solicitud, token/enlace, expiración, confirmación y cambio de contraseña. Mantener en `Tests` hasta completar el flujo. |

**Tarea técnica separada de las HU:** la tarjeta “Corrección de configuración en env y error de inicialización de MySQL” no es una HU funcional. Validar variables de entorno, inicialización de la base de datos y estado saludable de los servicios; no contarla como una HU del producto.

---

## 2. En progreso

| HU | Título | Qué falta |
|---|---|---|
| HU-25 | Recibir alertas de entregas próximas o vencidas | Confirmar si `alerts.service.js` ejecuta realmente un proceso automático por fechas. La matriz dice que hay un job horario, pero el backlog anterior afirma que faltaba. Probar alertas de próximas y vencidas y actualizar ambos documentos con el resultado. |
| HU-33 | Vincular mi cuenta de GitHub | El CRUD de integración está documentado; falta comprobar la conexión real con la API de GitHub y la consulta de commits/ramas que requiere el producto. |
| HU-35 | Exportar reportes del proyecto | Pendiente de implementar la generación de reportes PDF o Excel. La tarjeta aparece en `In Progress` en la captura; conservar ese estado mientras exista trabajo activo. |

---

## 3. Hecho en el tablero, pendiente de validación o reconciliación

Estas historias aparecen como `Done` en la captura o están registradas como hechas en la documentación, pero debe aplicarse el criterio de aceptación antes de cerrar cualquier duda.

| HU | Título | Acción de cierre |
|---|---|---|
| HU-13 | Registro de usuarios | Confirmar registro válido, validaciones, duplicados y respuesta de errores. |
| HU-14 | Inicio de sesión seguro | Confirmar credenciales válidas/incorrectas, JWT, bcrypt y limitación de intentos. |
| HU-15 | Acceso diferenciado por rol | Probar permisos en el backend para Administrador, Instructor y Aprendiz. |
| HU-17 | Crear proyecto | Probar creación, validaciones y permisos. |
| HU-18 | Asignar aprendices al equipo del proyecto | Probar reglas de integrantes permitidos y estado del aprendiz. |
| HU-19 | Definir entregables por fase | Probar creación, consulta y relación con fases/proyectos. |
| HU-20 | Historial de cambios del proyecto | Verificar que se registren los cambios y que el historial se consulte. |
| HU-21 | Ver el estado actual del proyecto | Confirmar datos correctos y acceso solo a proyectos autorizados. |
| HU-22 | Ver el porcentaje de avance | Probar el cálculo con datos reales y casos límite. |
| HU-23 | Comentar el avance de un entregable | El backlog anterior registra `POST/GET /comentarios` probado; conservar evidencia. |
| HU-24 | Calificar un entregable | El backlog registra rechazo `400` si no está “En Revisión” y aceptación `201` cuando corresponde; conservar evidencia. |
| HU-26 | Enviar mensajes dentro del proyecto | Probar envío/consulta y permisos entre los participantes autorizados. |
| HU-27 | Comentar dentro de una fase o entregable | El backlog registra que comparte endpoint con HU-23 y fue probado; confirmar ambos contextos. |
| HU-28 | Notificaciones en tiempo real | ✅ **Verificada y completada:** Implementada actualización en tiempo real con WebSocket nativo (`/ws`) y canal SSE de respaldo (`/api/v1/notificaciones/stream`); interfaz web sincronizada automáticamente sin recargar y suite de verificación automatizada `test-realtime.js` aprobada. |
| HU-29 | Asignar tareas a un integrante | Probar asignación, permisos y asociación con proyecto/equipo. |
| HU-30 | Actualizar el estado de una tarea | Probar transiciones válidas, restricciones y entregas relacionadas. |
| HU-31 | Programar reuniones del proyecto | El backlog anterior registra `POST/GET /reuniones` y notificación al equipo; conservar evidencia de prueba. |
| HU-32 | Ver la línea de tiempo del proyecto | **Conflicto importante:** la captura la muestra en `Done`, pero el backlog anterior dice que no existe una vista unificada. Verificar frontend y API; un endpoint por sí solo no demuestra que la historia esté terminada. |

**Nota:** la captura solo deja leer una parte de la columna `Done`. No implica que todas las historias listadas en esta sección sean visibles individualmente en la imagen; algunas proceden del registro documental. Confirmar las tarjetas ocultas mediante GitHub Projects.

---

## 4. Parcial

| HU | Título | Estado y trabajo pendiente |
|---|---|---|
| HU-34 | Adjuntar archivos a un entregable | La documentación de historias de usuario indica que la subida física ya funciona con Multer y volumen persistente local. El requisito de almacenamiento en nube (por ejemplo, Drive/S3) sigue pendiente si permanece dentro del alcance. Confirmar qué versión de la implementación está desplegada y alinear el estado del tablero. |

No marcar HU-34 como totalmente terminada solo porque se guarden archivos localmente, si el requisito de aceptación exige almacenamiento en la nube.

---

## 5. Resumen de HU funcionales

| Estado recomendado | Historias | Cantidad |
|---|---|---:|
| En pruebas | HU-16 | 1 |
| En progreso | HU-25, HU-33, HU-35 | 3 |
| Parcial | HU-34 | 1 |
| Hechas según documentación, pendientes de comprobar/conciliar | HU-13, HU-14, HU-15, HU-17, HU-18, HU-19, HU-20, HU-21, HU-22, HU-23, HU-24, HU-26, HU-27, HU-28, HU-29, HU-30, HU-31, HU-32 | 18 |
| **Total** | **HU-13 a HU-35** | **23** |

Este resumen es un estado de seguimiento recomendado, no un conteo de pruebas ejecutadas. HU-28 y HU-32 aparecen como hechas en el tablero, pero requieren reconciliación técnica. HU-16 y HU-25 tienen contradicciones entre la matriz y el backlog.

---

## 6. Historias internas HU-01 a HU-12

Estas HU son trabajo interno de los sprints y se administran aparte de las 23 HU funcionales:

| HU | Trabajo | Estado registrado |
|---|---|---|
| HU-01 | Documentar requisitos funcionales y no funcionales | Completada |
| HU-02 | Diseñar modelo entidad-relación | Completada |
| HU-03 | Crear DDL de base de datos | Completada |
| HU-04 | Documentar reglas de negocio y restricciones | Completada |
| HU-05 | Identificar casos de uso principales | Completada |
| HU-06 | Diagrama de clases UML | Completada |
| HU-07 | Definir arquitectura de software | Completada |
| HU-08 | Documentar API REST | Completada |
| HU-09 | Panel del aprendiz | Completada como HTML base; validar integración funcional |
| HU-10 | Panel del instructor | Completada como HTML base; validar integración funcional |
| HU-11 | Panel del administrador | Completada como HTML base; validar integración funcional |
| HU-12 | Integrar frontend HTML con React/Vite | Parcial según el registro del sprint |

---

## 7. Orden recomendado para corregir el tablero

1. **HU-16:** ejecutar pruebas completas de recuperación de contraseña y actualizar la matriz/backlog según el código real.
2. **HU-25:** confirmar el job automático de alertas por fechas; corregir la documentación si el job existe o implementar lo que falte.
3. **HU-28:** ✅ Actualización en tiempo real sin recarga implementada y verificada mediante WebSocket nativo (`/ws`) y SSE (`/api/v1/notificaciones/stream`).
4. **HU-32:** verificar que la línea de tiempo esté disponible y funcional en la interfaz. Si solo existe el endpoint, mover a `In Progress`.
5. **HU-33:** terminar la conexión real con GitHub y validar commits/ramas.
6. **HU-34:** confirmar la carga física local y decidir si el almacenamiento en nube es obligatorio en el alcance actual.
7. **HU-35:** implementar y probar la exportación PDF/Excel.
8. Revisar las tarjetas ocultas en `Done` y asociar evidencia de aceptación.
9. Corregir `historias-usuario.md` y `matriz-trazabilidad.md` para que no contradigan el estado final del tablero.

## 8. Criterios para mover una HU a “Hecho”

Mover una historia a `Done` únicamente cuando:

- cumple todos los criterios de aceptación;
- se prueban el caso exitoso y los casos de error;
- se verifican permisos y reglas de negocio en el backend;
- frontend, backend y persistencia están integrados cuando aplique;
- existe evidencia de prueba;
- la historia, matriz de trazabilidad y tarjeta de GitHub Projects muestran el mismo estado.

---

## 9. Observación sobre HU-04 y las ramas

En el sprint, **HU-04 corresponde a documentar reglas de negocio y restricciones**. La rama `feature/HU-04-consultar-proyectos` no coincide con esa definición. No eliminarla automáticamente: primero confirmar si se renombra o si representa otra tarea.

---

*Documento actualizado con la evidencia compartida el 16 de octubre de 2026. Los estados de ejecución deben confirmarse contra el código y las pruebas del repositorio.*
