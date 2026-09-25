// =====================================================
// database/admin-unico.js
// Deja el sistema con UN ÚNICO Administrador, sin borrar datos.
//
// Úsalo sobre una base de datos que ya tiene información (el seed.js
// vacía las tablas; este script no):
//
//   Docker:  docker compose exec backend node database/admin-unico.js
//   Local:   node database/admin-unico.js
//
// Qué hace:
//   1. Toma el Administrador con el id más bajo y le asigna el correo,
//      la contraseña y el nombre definidos abajo (y lo deja activo).
//   2. Si existen otros Administradores, los pasa a Instructor y los
//      desactiva, para que solo quede uno.
// =====================================================

require('dotenv').config();
const mysql  = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const ADMIN = {
  nombres:    'Rubiel',
  apellidos:  'Rodríguez',
  correo:     'rubiel.tads@gmail.com',
  contrasena: 'ELruby2oo4@',
};

const DB_CONFIG = {
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT) || 3306,
  database: process.env.DB_NAME     || 'SistemaGestionProyectosSENA',
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || '',
};

async function main() {
  const conn = await mysql.createConnection(DB_CONFIG);
  try {
    await conn.beginTransaction();

    const [admins] = await conn.query(
      `SELECT u.id_usuario, u.correo
         FROM usuarios u JOIN roles r ON u.id_rol = r.id_rol
        WHERE r.nombre_rol = 'Administrador'
        ORDER BY u.id_usuario`
    );
    if (!admins.length) {
      throw new Error('No hay ningún Administrador en la base de datos. Ejecuta primero el seed.');
    }

    const principal = admins[0];

    const [conflicto] = await conn.query(
      'SELECT id_usuario FROM usuarios WHERE correo = ? AND id_usuario <> ?',
      [ADMIN.correo, principal.id_usuario]
    );
    if (conflicto.length) {
      throw new Error(`El correo ${ADMIN.correo} ya pertenece al usuario ${conflicto[0].id_usuario}.`);
    }

    const hash = await bcrypt.hash(ADMIN.contrasena, 10);
    await conn.query(
      `UPDATE usuarios SET nombres = ?, apellidos = ?, correo = ?, contrasena = ?, estado = 1
        WHERE id_usuario = ?`,
      [ADMIN.nombres, ADMIN.apellidos, ADMIN.correo, hash, principal.id_usuario]
    );
    console.log(`✅  Administrador único: ${ADMIN.correo} (id ${principal.id_usuario}, antes ${principal.correo})`);

    const sobrantes = admins.slice(1);
    if (sobrantes.length) {
      const ids = sobrantes.map(a => a.id_usuario);
      await conn.query(
        `UPDATE usuarios SET id_rol = (SELECT id_rol FROM roles WHERE nombre_rol = 'Instructor'), estado = 0
          WHERE id_usuario IN (?)`,
        [ids]
      );
      sobrantes.forEach(a => console.log(`⚠️   ${a.correo} (id ${a.id_usuario}) pasó a Instructor y quedó desactivado`));
    }

    await conn.commit();
    console.log('✅  Listo.');
  } catch (err) {
    await conn.rollback();
    console.error('❌ ', err.message);
    process.exitCode = 1;
  } finally {
    await conn.end();
  }
}

main();
