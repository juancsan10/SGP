# 📄 Explicación de `database/seed.js`

Este script inserta datos de ejemplo en la base de datos `SistemaGestionProyectosSENA`
para poder probar el sistema con información realista sin tener que cargarla manualmente.

## Uso
​```bash
pnpm install
node database/seed.js
​```
> Ejecutar **después** de levantar la base de datos con Docker (`docker compose up -d` desde
> la raíz del repo). El esquema (las 16 tablas) ya se crea automáticamente al iniciar el
> contenedor — ver [`../../database/docker-init/001_schema.sql`](../../database/docker-init/001_schema.sql),
> que es la única fuente de verdad del esquema. No hay un `schema.sql` local en esta carpeta
> para evitar tener dos versiones desincronizadas.
>
> Este script siembra datos de ejemplo para las **16 tablas**, incluidas `comentarios`,
> `archivos`, `reuniones` y `github_integration` (ver `../README.md` para el detalle de sus
> endpoints). La tabla `evaluaciones` queda vacía a propósito: RN-016 exige que el proyecto
> del entregable esté en estado "En Revisión" antes de poder evaluarlo, así que pruébala
> cambiando el estado de un proyecto vía `PUT /proyectos/:id` y luego llamando a
> `POST /evaluaciones`.

## ¿Qué hace paso a paso?

1. **Conexión a MySQL**
   Usa variables de entorno (`.env`) con valores por defecto (host, puerto, usuario, contraseña, nombre de la BD).
   Si falla, muestra una checklist de verificación (MySQL activo, `.env` correcto, BD creada).

2. **Limpieza de tablas**
   Antes de insertar, se desactivan temporalmente las validaciones de llaves foráneas
   (`SET FOREIGN_KEY_CHECKS = 0`) para poder truncar todas las tablas sin importar el orden,
   y luego se reactivan (`= 1`).

3. **Inserción de datos en orden de dependencia**
   - `roles` (Administrador, Instructor, Aprendiz)
   - `usuarios` (10 usuarios de prueba, contraseña `123` hasheada con bcrypt)
   - `proyectos` (4 proyectos de ejemplo)
   - `equipos_proyecto` (asignación de usuarios a proyectos)
   - `fases_proyecto` (fases de cada proyecto)
   - `entregables` (documentos/productos por fase)
   - `tareas` (tareas asignadas por proyecto y usuario)
   - `mensajes` (chat simulado entre miembros del proyecto)
   - `notificaciones` (avisos del sistema por usuario)
   - `repositorios` (links de GitHub por proyecto)

4. **Seguridad en contraseñas**
   No se guardan en texto plano: se usa `bcrypt.hash('123', 10)` para simular
   el comportamiento real de autenticación del sistema.

5. **Resumen final en consola**
   Al terminar, imprime las cuentas de prueba disponibles y su rol, para poder
   iniciar sesión rápido durante el desarrollo o la sustentación.

## Cuentas de prueba generadas

| Correo             | Rol            | Contraseña |
|---------------------|----------------|------------|
| juan@mail.com        | Administrador  | 123        |
| maria@mail.com       | Instructor     | 123        |
| luis@mail.com        | Instructor     | 123        |
| carlos@mail.com      | Aprendiz       | 123        |
| ana@mail.com          | Aprendiz       | 123        |

## Por qué existe este script

- Evita cargar datos de prueba manualmente en MySQL Workbench.
- Garantiza que todo el equipo (Rubiel, Juan Manuel, Juan Carlos) trabaje con
  el mismo set de datos de referencia.
- Simula un flujo de trabajo real (tareas en distintos estados, mensajes, notificaciones)
  para probar el dashboard con información representativa.