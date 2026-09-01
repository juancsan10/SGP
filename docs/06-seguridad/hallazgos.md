# Hallazgos de seguridad — estado

| ID | Estado | Mitigación |
|---|---|---|
| SEC-01 | Corregido | Registro público fuerza rol Aprendiz; creación de Admin/Instructor protegida. |
| SEC-02 | Corregido | Actualización exige propietario/Admin y cambio de contraseña separado con contraseña actual. |
| SEC-03 | Corregido | `requireProjectMember` valida instructor o pertenencia del aprendiz. |
| SEC-04 | Corregido | Rate limit de 5 intentos/15 minutos en autenticación sensible. |
| SEC-05 | Corregido | `JWT_SECRET` vacío en ejemplo y validación de longitud en producción. |
| SEC-06 | Pendiente | El token de GitHub debe cifrarse con AES-256-GCM; no se devuelve en respuestas. |
| SEC-07 | Corregido | Respuestas 500 genéricas; detalle solo en logs del servidor. |
| SEC-08 | Mitigado | Se mantiene JWT en cliente por compatibilidad; migración a cookie httpOnly queda como deuda técnica. |
| SEC-09 | Corregido parcialmente | Validaciones críticas de autenticación y contraseñas; ampliar validadores por módulo como mejora. |
| SEC-10 | Corregido | En producción no se permite CORS abierto por omisión. |
| SEC-11 | Corregido | Endpoints principales aceptan `limit` y `offset` con máximo 100. |
| SEC-12 | Corregido | MySQL ya no se publica al host en el compose de producción. |
| SEC-13 | Mitigado | La terminación TLS queda delegada al proxy institucional; documentar certificado en despliegue. |
