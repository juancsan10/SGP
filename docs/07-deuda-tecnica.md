# Deuda técnica y alcance futuro (priorizada)

Prioridad = riesgo e impacto sobre usuarios reales, no solo esfuerzo. Esfuerzo: S (≤1 día), M (2–4 días), L (más de 4 días). Los responsables y fechas los asigna el equipo en el planning.

## Prioridad ALTA (antes de producción real)
| ID | Deuda | Impacto | Esfuerzo |
|---|---|---|---|
| TD-01 | **SEC-06** `github_token` sin cifrar en BD | Fuga de tokens si se filtra la BD | M |
| TD-02 | **SEC-13** TLS: certificado y proxy final dependen de la infraestructura institucional | Tráfico y JWT sin cifrar en tránsito | M (coordinación) |
| TD-03 | Ejecutar las pruebas de integración (MySQL real) en el CI | Regresiones de BD sin detectar | S |
| TD-04 | **SEC-08** JWT en localStorage → cookie httpOnly | Riesgo ante XSS (mitigado hoy) | M |

## Prioridad MEDIA
| ID | Deuda | Impacto | Esfuerzo |
|---|---|---|---|
| TD-05 | HU-35 exportar reportes PDF/Excel (RF6.3) | Funcionalidad pedida sin entregar | L |
| TD-06 | HU-33 completar integración con GitHub | Funcionalidad parcial | M |
| TD-07 | RF6.2 almacenamiento en la nube de archivos (hoy volumen local) | Pérdida de adjuntos si se pierde el volumen | M |
| TD-08 | API documentada manualmente → generar OpenAPI/Swagger | El contrato se desactualiza (ya ocurrió) | M |
| TD-09 | E2E en el CI (hoy solo local) | Fallos de flujo no detectados | M |
| TD-10 | Verificar WebSocket/SSE detrás de nginx en Docker (se añadió `/ws`, falta prueba en contenedores) | Tiempo real podría fallar en despliegue | S |
| TD-11 | Cobertura de ramas 64–68 % → 75 % | Caminos de error sin probar | M |

## Prioridad BAJA
| ID | Deuda | Impacto | Esfuerzo |
|---|---|---|---|
| TD-12 | Nomenclatura técnica en español → inglés gradual | Consistencia | L |
| TD-13 | React Router 7: validar compatibilidad final | Riesgo bajo, CI verde | S |
| TD-14 | Ramas obsoletas (`STG`, `feature/HU-35`, `chore/deps-audit`) | Orden del repositorio | S |
| TD-15 | Tablero de seguimiento apunta al repositorio antiguo | Documentación confusa | S |

## Resuelto
- RF4.4 tiempo real: WebSocket nativo (`/ws`) + SSE (`/api/v1/notificaciones/stream`).
- Dependencias vulnerables: `pnpm audit --audit-level=high` sin hallazgos en backend y frontend.
- Validación de variables de entorno al arrancar (`backend/src/config/env.js`).
