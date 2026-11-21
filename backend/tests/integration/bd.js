import { createRequire } from 'node:module';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Utilidades compartidas por los tests de integración.
// La conexión llega SOLO por DATABASE_URL (ninguna credencial en los tests).
// Sin DATABASE_URL los tests se saltan: el CI de hoy no tiene BD (llega en la semana 8).
export const hayBd = Boolean(process.env.DATABASE_URL);

const require = createRequire(import.meta.url);
export const db = hayBd ? require('../../src/config/db') : null;

export const SECRETO = 'secreto_solo_para_tests_de_integracion';
process.env.JWT_SECRET = SECRETO;

export const tokenDe = (usuario) =>
  `Bearer ${jwt.sign({ id: usuario.id_usuario, rol: usuario.rol }, SECRETO, { expiresIn: '1h' })}`;

// Limpieza: TRUNCATE de todas las tablas antes de cada test y roles de nuevo.
// Se eligió truncado y no transacción con rollback porque la app usa un pool:
// cada consulta puede ir por una conexión distinta y un rollback no la alcanzaría.
export async function limpiarBd() {
  const conn = await db.getConnection();
  try {
    const [[{ base }]] = await conn.query('SELECT DATABASE() AS base');
    // Protección: nunca limpiar una BD que no sea de pruebas (desarrollo o producción)
    if (!String(base).endsWith('_test')) {
      throw new Error(`DATABASE_URL apunta a "${base}": los tests solo corren contra una BD que termine en _test`);
    }
    const [tablas] = await conn.query(
      'SELECT table_name AS nombre FROM information_schema.tables WHERE table_schema = ? AND table_type = ?',
      [base, 'BASE TABLE'],
    );
    await conn.query('SET FOREIGN_KEY_CHECKS = 0');
    for (const { nombre } of tablas) await conn.query(`TRUNCATE TABLE \`${nombre}\``);
    await conn.query('SET FOREIGN_KEY_CHECKS = 1');
    await conn.query(`INSERT INTO roles (id_rol, nombre_rol, descripcion) VALUES
      (1, 'Administrador', 'Control total del sistema'),
      (2, 'Instructor', 'Gestiona proyectos y aprendices'),
      (3, 'Aprendiz', 'Participa en proyectos asignados')`);
  } finally {
    conn.release();
  }
}

const ID_ROL = { Administrador: 1, Instructor: 2, Aprendiz: 3 };
let secuencia = 0;
const unico = () => `${Date.now().toString(36)}${(secuencia += 1)}`;

// Cada test crea sus propios datos con valores únicos (nunca ids fijos)
export async function crearUsuario({ rol = 'Aprendiz', ...datos } = {}) {
  const sufijo = unico();
  const usuario = {
    nombres: 'Prueba',
    apellidos: `Integracion ${sufijo}`,
    correo: `prueba.${sufijo}@sgpsena.local`,
    identificacion: `9${String(Date.now()).slice(-8)}${secuencia}`,
    contrasena: await bcrypt.hash('Sena2026*', 4),
    programa_formacion: 'Análisis y Desarrollo de Software',
    ficha: '3228970',
    ...datos,
  };
  const [r] = await db.query(
    `INSERT INTO usuarios (nombres, apellidos, correo, identificacion, contrasena, programa_formacion, ficha, id_rol)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [usuario.nombres, usuario.apellidos, usuario.correo, usuario.identificacion, usuario.contrasena,
      usuario.programa_formacion, usuario.ficha, ID_ROL[rol]],
  );
  return { ...usuario, id_usuario: r.insertId, rol };
}

export async function crearProyecto({ id_instructor, ...datos }) {
  const proyecto = {
    nombre: `Proyecto ${unico()}`,
    fecha_inicio: '2026-02-01',
    fecha_fin: '2026-06-30',
    estado: 'Activo',
    ...datos,
  };
  const [r] = await db.query(
    'INSERT INTO proyectos (nombre, fecha_inicio, fecha_fin, estado, id_instructor) VALUES (?, ?, ?, ?, ?)',
    [proyecto.nombre, proyecto.fecha_inicio, proyecto.fecha_fin, proyecto.estado, id_instructor],
  );
  return { ...proyecto, id_proyecto: r.insertId, id_instructor };
}

export async function agregarAlEquipo(id_proyecto, id_usuario) {
  await db.query('INSERT INTO equipos_proyecto (id_proyecto, id_usuario) VALUES (?, ?)', [id_proyecto, id_usuario]);
}
