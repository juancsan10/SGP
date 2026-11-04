# Recuperación de contraseña (HU-16)

Flujo de 3 pasos, sin que el código viaje nunca por la API (solo por correo):

| Paso | Endpoint | Regla |
|------|----------|-------|
| 1. Solicitar | `POST /auth/password-reset/request` `{correo}` | Código de 6 dígitos (`crypto.randomInt`), vence en **3 min**, enviado **solo al correo de esa cuenta**. Respuesta idéntica exista o no el correo (anti-enumeración). Espera de 60 s entre solicitudes por cuenta. |
| 2. Verificar | `POST /auth/password-reset/verify` `{correo, token}` | Máx. **5 intentos** por código; al acertar entrega una sesión de 5 min (`reset_session`) que **habilita** el formulario de nueva contraseña. |
| 3. Cambiar | `POST /auth/password-reset/confirm` `{correo, reset_session, nueva_contrasena}` | Mín. 8 caracteres con letra y número. Un solo uso. |

Seguridad: código y sesión se guardan solo como HMAC-SHA256 (nunca en claro); comparación en tiempo constante; límite por IP además del límite por cuenta.

## Envío de correo
Variables en `.env` (ver `.env.example`):
- `MAIL_MODE=console` (por defecto): el código se imprime en `docker compose logs backend`. Útil para demo/desarrollo.
- `MAIL_MODE=smtp` + `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`: envío real (p. ej. Gmail con contraseña de aplicación: `smtp.gmail.com`, 587).

## Actualizar una BD ya creada
```
docker compose exec -T db sh -c 'mysql -u root -p"$MYSQL_ROOT_PASSWORD" $MYSQL_DATABASE' < database/migracion_recuperacion_contrasena.sql
docker compose up -d --build
```
(o `docker compose down -v` y levantar de nuevo para recrear todo con el seed).
