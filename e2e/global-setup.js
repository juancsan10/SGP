import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import mysql from 'mysql2/promise';
import { BACKEND_URL, DATABASE_URL } from './playwright.config.js';

// Antes de toda la suite:
// 1. Deja la BD de pruebas vacía (TRUNCATE) con los roles y un único administrador.
//    Así la suite pasa igual la primera vez, la segunda y después de un "down -v".
// 2. Inicia sesión UNA vez como administrador por el API y guarda la sesión en
//    .auth/admin.json. Los tests la reutilizan: nadie hace login por la UI para preparar datos.
// El resto de los datos (instructores, aprendices, proyectos, tareas) los crea cada test por el API.
const carpeta = path.dirname(fileURLToPath(import.meta.url));
export const ADMIN = { correo: 'admin.e2e@sgpsena.local', contrasena: 'AdminE2e2026*' };

export default async function globalSetup(config) {
  const conn = await mysql.createConnection(DATABASE_URL);
  try {
    const [[{ base }]] = await conn.query('SELECT DATABASE() AS base');
    if (!String(base).endsWith('_test')) {
      throw new Error(`DATABASE_URL apunta a "${base}": los E2E solo corren contra una BD que termine en _test`);
    }
    const [tablas] = await conn.query(
      'SELECT table_name AS nombre FROM information_schema.tables WHERE table_schema = ? AND table_type = ?', [base, 'BASE TABLE'],
    );
    await conn.query('SET FOREIGN_KEY_CHECKS = 0');
    for (const { nombre } of tablas) await conn.query(`TRUNCATE TABLE \`${nombre}\``);
    await conn.query('SET FOREIGN_KEY_CHECKS = 1');
    await conn.query(`INSERT INTO roles (id_rol, nombre_rol, descripcion) VALUES
      (1, 'Administrador', 'Control total del sistema'), (2, 'Instructor', 'Gestiona proyectos y aprendices'),
      (3, 'Aprendiz', 'Participa en proyectos asignados')`);
    await conn.query(
      "INSERT INTO usuarios (nombres, apellidos, correo, contrasena, id_rol) VALUES ('Admin', 'E2E', ?, ?, 1)",
      [ADMIN.correo, await bcrypt.hash(ADMIN.contrasena, 4)],
    );
  } finally {
    await conn.end();
  }

  const res = await fetch(`${BACKEND_URL}/api/v1/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(ADMIN),
  });
  if (!res.ok) throw new Error(`No se pudo iniciar sesión como administrador: ${res.status}`);
  const { data } = await res.json();

  const origen = config.projects[0].use.baseURL;
  fs.mkdirSync(path.join(carpeta, '.auth'), { recursive: true });
  fs.writeFileSync(path.join(carpeta, '.auth', 'admin.json'), JSON.stringify({
    cookies: [],
    origins: [{ origin: origen, localStorage: [
      { name: 'sgp_token', value: data.token },
      { name: 'sgp_usuario', value: JSON.stringify(data.usuario) },
    ] }],
  }, null, 2));
}
