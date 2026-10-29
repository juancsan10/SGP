# Matriz de rotación de capas

**Grupo**: SGP SENA — Sistema de Gestión de Proyectos · **Ficha**: _número_ · **Stack**: React + Express + MySQL

Capas: **Front** (React) · **API** (backend) · **BD** (integración) · **E2E** (Playwright)

Reglas:

- Cada semana cambias de capa. No repites capa hasta haber pasado por las cuatro.
- En la columna escribe la capa y, al cerrar la semana, el enlace a tu PR de tests.
- Quien revisa tu PR debe haber trabajado en otra capa esa semana.
- Cada integrante llena solo su fila.

| Integrante (usuario GitHub) | S1 | S2 | S3 | S4 | S5 | S6 | S7 | S8 | S9 |
|---|---|---|---|---|---|---|---|---|---|
| Rubiel Rodríguez (@usuario) | E2E: login exitoso | | | | | | | | |
| Juan Manuel Arcila (@usuario) | | | | | | | | | |
| Juan Carlos Sánchez (@juancsan10) | E2E: contraseña incorrecta | | | | | | | | |

Grupo de 3: rotamos entre Front, API y E2E (la capa BD se cubre desde la semana 6).

## Regla de rama

Pendiente: se configura en la semana 2 junto con el CI.

## Cobertura semanal

Anota la cobertura real al cerrar cada semana. El umbral de la semana siguiente es el mayor entre el piso del plan y este valor, redondeado hacia abajo.

| Semana | Frontend (%) | Backend (%) | Umbral configurado para la semana siguiente |
|---|---|---|---|
| S1 (línea base) | 0 | 0 | 0 en la config (línea base) |

> La línea base es 0% porque el proyecto no tenía pruebas unitarias y los E2E no cuentan para la cobertura. Se mide con `pnpm test` en `frontend/` y en `backend/`.

## Registro de vocero aleatorio

El vocero escribe su respuesta **antes** de que el instructor llegue a la mesa; el instructor la verifica con una pregunta corta y anota el resultado.

| Semana | Vocero | Capa preguntada | Respuesta escrita | Resultado (Alto / Medio / Bajo) |
|---|---|---|---|---|
| S1 | | | | |
