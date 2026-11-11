// =====================================================
// controllers/solicitudes-aprendiz.controller.js  (NUEVO — punto 10, #19)
// El Instructor no crea aprendices directamente: envía una solicitud con
// todos los datos obligatorios y el Administrador la aprueba o la rechaza.
// · Al aprobar se crea la cuenta (rol Aprendiz) con la contraseña temporal
//   que indicó el Instructor y el aprendiz entra al equipo del proyecto.
// · La contraseña viaja una sola vez y se guarda ya cifrada (bcrypt).
// =====================================================
const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { registrarCambio } = require('../services/historial.service');
const notificacionesService = require('../services/notificaciones.service');

const ESTADOS = ['Pendiente', 'Aprobada', 'Rechazada'];
const CORREO_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const CC_RE = /^[0-9]{5,15}$/;
const ID_ROL_APRENDIZ = 3;

// Nunca se devuelve contrasena_hash.
const SELECT_BASE = `
  SELECT sa.id_solicitud_aprendiz, sa.id_instructor, sa.id_proyecto, sa.nombres, sa.apellidos, sa.correo,
         sa.identificacion, sa.ficha, sa.programa_formacion, sa.estado, sa.respuesta_admin,
         sa.id_admin_resuelve, sa.id_usuario_creado, sa.fecha_solicitud, sa.fecha_resolucion,
         CONCAT(i.nombres,' ',i.apellidos) AS instructor_nombre,
         p.nombre AS proyecto_nombre,
         CONCAT(a.nombres,' ',a.apellidos) AS admin_nombre
  FROM solicitudes_aprendiz sa
  JOIN usuarios i ON i.id_usuario = sa.id_instructor
  LEFT JOIN proyectos p ON p.id_proyecto = sa.id_proyecto
  LEFT JOIN usuarios a ON a.id_usuario = sa.id_admin_resuelve`;

const texto = (v) => (typeof v === 'string' ? v.trim() : '');

// Devuelve el primer error de validación o null.
function validarDatos(d) {
  if (d.nombres.length < 2 || d.nombres.length > 100) return 'Los nombres deben tener entre 2 y 100 caracteres';
  if (d.apellidos.length < 2 || d.apellidos.length > 100) return 'Los apellidos deben tener entre 2 y 100 caracteres';
  if (!CORREO_RE.test(d.correo) || d.correo.length > 150) return 'El correo no tiene un formato válido';
  if (!CC_RE.test(d.identificacion)) return 'La identificación (cc) debe tener entre 5 y 15 dígitos, sin puntos ni espacios';
  if (d.ficha.length < 1 || d.ficha.length > 50) return 'La ficha es obligatoria (máximo 50 caracteres)';
  if (d.programa_formacion.length < 3 || d.programa_formacion.length > 150) return 'El programa de formación es obligatorio (entre 3 y 150 caracteres)';
  if (!Number.isInteger(d.id_proyecto) || d.id_proyecto < 1) return 'Selecciona el proyecto al que se asignará el aprendiz';
  if (typeof d.contrasena !== 'string' || d.contrasena.length < 8 || d.contrasena.length > 128
      || !/[A-Za-z]/.test(d.contrasena) || !/[0-9]/.test(d.contrasena)) {
    return 'La contraseña temporal debe tener mínimo 8 caracteres, con al menos una letra y un número';
  }
  return null;
}

// Correo o cédula ya usados por una cuenta o por otra solicitud pendiente.
async function buscarDuplicado(conn, correo, identificacion, excluirId = null) {
  const [usuarios] = await conn.query(
    'SELECT correo, identificacion FROM usuarios WHERE correo = ? OR identificacion = ? LIMIT 1', [correo, identificacion]);
  if (usuarios.length) {
    return usuarios[0].correo === correo ? 'Ya existe una cuenta con ese correo' : 'Ya existe una cuenta con esa identificación';
  }
  const [pendientes] = await conn.query(
    `SELECT correo FROM solicitudes_aprendiz
     WHERE estado = 'Pendiente' AND (correo = ? OR identificacion = ?) AND id_solicitud_aprendiz <> ? LIMIT 1`,
    [correo, identificacion, excluirId || 0]);
  if (pendientes.length) return 'Ya hay una solicitud pendiente con ese correo o identificación';
  return null;
}

// POST /api/v1/solicitudes/aprendices  (Instructor)
const create = async (req, res) => {
  try {
    const datos = {
      nombres: texto(req.body.nombres),
      apellidos: texto(req.body.apellidos),
      correo: texto(req.body.correo).toLowerCase(),
      identificacion: texto(req.body.identificacion),
      ficha: texto(req.body.ficha),
      programa_formacion: texto(req.body.programa_formacion),
      id_proyecto: Number(req.body.id_proyecto),
      contrasena: req.body.contrasena,
    };
    const error = validarDatos(datos);
    if (error) return res.status(400).json({ success: false, message: error });

    // Solo puede pedir aprendices para sus propios proyectos.
    const [propio] = await db.query('SELECT id_proyecto, nombre FROM proyectos WHERE id_proyecto = ? AND id_instructor = ?',
      [datos.id_proyecto, req.user.id]);
    if (!propio.length) return res.status(403).json({ success: false, message: 'Solo puedes solicitar aprendices para tus proyectos' });

    const duplicado = await buscarDuplicado(db, datos.correo, datos.identificacion);
    if (duplicado) return res.status(409).json({ success: false, message: duplicado });

    const hash = await bcrypt.hash(datos.contrasena, 10);
    const [r] = await db.query(
      `INSERT INTO solicitudes_aprendiz
         (id_instructor, id_proyecto, nombres, apellidos, correo, identificacion, ficha, programa_formacion, contrasena_hash)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, datos.id_proyecto, datos.nombres, datos.apellidos, datos.correo, datos.identificacion,
       datos.ficha, datos.programa_formacion, hash]);

    const [admins] = await db.query(
      `SELECT u.id_usuario FROM usuarios u JOIN roles r ON r.id_rol = u.id_rol WHERE r.nombre_rol = 'Administrador' AND u.estado = 1`);
    await notificacionesService.crearYNotificarMultiples({
      ids_usuarios: admins.map(a => a.id_usuario),
      titulo: 'Nueva solicitud: crear aprendiz',
      mensaje: `${datos.nombres} ${datos.apellidos} para el proyecto "${propio[0].nombre}" — apruébala o recházala en Solicitudes.`,
      tipo: 'sistema',
      prioridad: 'Media',
      id_creador: req.user.id,
    });

    await registrarCambio('solicitudes_aprendiz', r.insertId, 'INSERT', req.user.id);
    return res.status(201).json({
      success: true,
      message: 'Solicitud enviada: el Administrador revisará y aprobará la creación del aprendiz',
      data: { id_solicitud_aprendiz: r.insertId },
    });
  } catch (err) {
    console.error(err); return res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

// GET /api/v1/solicitudes/aprendices/mias  (Instructor)
const mias = async (req, res) => {
  try {
    const [rows] = await db.query(`${SELECT_BASE} WHERE sa.id_instructor = ? ORDER BY sa.fecha_solicitud DESC LIMIT 50`, [req.user.id]);
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err); return res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

// GET /api/v1/solicitudes/aprendices  (Administrador) — ?estado=&limit=&offset=
const getAll = async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 100);
    const offset = Math.max(Number(req.query.offset) || 0, 0);
    const estado = ESTADOS.includes(req.query.estado) ? req.query.estado : null;
    const where = estado ? 'WHERE sa.estado = ?' : '';
    const params = estado ? [estado] : [];
    const [rows] = await db.query(
      `${SELECT_BASE} ${where} ORDER BY (sa.estado = 'Pendiente') DESC, sa.fecha_solicitud DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]);
    const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM solicitudes_aprendiz sa ${where}`, params);
    const [conteos] = await db.query('SELECT estado, COUNT(*) AS total FROM solicitudes_aprendiz GROUP BY estado');
    const resumen = Object.fromEntries(ESTADOS.map(e => [e, 0]));
    conteos.forEach(c => { resumen[c.estado] = Number(c.total); });
    return res.json({ success: true, data: rows, meta: { total, limit, offset, resumen } });
  } catch (err) {
    console.error(err); return res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

// PUT /api/v1/solicitudes/aprendices/:id/resolver  (Administrador)
// body: { estado: 'Aprobada' | 'Rechazada', respuesta }
const resolver = async (req, res) => {
  const estado = req.body.estado;
  const respuesta = texto(req.body.respuesta);
  if (!['Aprobada', 'Rechazada'].includes(estado)) return res.status(400).json({ success: false, message: 'El estado debe ser Aprobada o Rechazada' });
  if (respuesta.length < 5) return res.status(400).json({ success: false, message: 'Escribe una respuesta para el instructor (mínimo 5 caracteres)' });

  let conn;
  try {
    conn = await db.getConnection();
    await conn.beginTransaction();
    const [[sol]] = await conn.query('SELECT * FROM solicitudes_aprendiz WHERE id_solicitud_aprendiz = ? FOR UPDATE', [req.params.id]);
    if (!sol) { await conn.rollback(); return res.status(404).json({ success: false, message: 'Solicitud no encontrada' }); }
    if (sol.estado !== 'Pendiente') { await conn.rollback(); return res.status(409).json({ success: false, message: 'La solicitud ya fue resuelta' }); }

    let idUsuario = null;
    if (estado === 'Aprobada') {
      const duplicado = await buscarDuplicado(conn, sol.correo, sol.identificacion, sol.id_solicitud_aprendiz);
      if (duplicado) { await conn.rollback(); return res.status(409).json({ success: false, message: `No se puede aprobar: ${duplicado.toLowerCase()}` }); }
      const [u] = await conn.query(
        `INSERT INTO usuarios (nombres, apellidos, correo, identificacion, contrasena, ficha, programa_formacion, id_rol)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [sol.nombres, sol.apellidos, sol.correo, sol.identificacion, sol.contrasena_hash, sol.ficha, sol.programa_formacion, ID_ROL_APRENDIZ]);
      idUsuario = u.insertId;
      if (sol.id_proyecto) {
        await conn.query('INSERT INTO equipos_proyecto (id_proyecto, id_usuario, rol_en_equipo) VALUES (?, ?, ?)',
          [sol.id_proyecto, idUsuario, 'Aprendiz']);
      }
    }

    await conn.query(
      `UPDATE solicitudes_aprendiz
       SET estado = ?, respuesta_admin = ?, id_admin_resuelve = ?, id_usuario_creado = ?, fecha_resolucion = NOW()
       WHERE id_solicitud_aprendiz = ?`,
      [estado, respuesta, req.user.id, idUsuario, sol.id_solicitud_aprendiz]);
    await conn.commit();

    if (idUsuario) await registrarCambio('usuarios', idUsuario, 'INSERT', req.user.id);
    await registrarCambio('solicitudes_aprendiz', sol.id_solicitud_aprendiz, estado.toUpperCase(), req.user.id);
    await notificacionesService.crearYNotificar({
      titulo: estado === 'Aprobada' ? 'Aprendiz creado' : 'Solicitud de aprendiz rechazada',
      mensaje: estado === 'Aprobada'
        ? `${sol.nombres} ${sol.apellidos} ya tiene cuenta y está en el equipo del proyecto. ${respuesta}`
        : `${sol.nombres} ${sol.apellidos}: ${respuesta}`,
      tipo: 'sistema',
      prioridad: 'Media',
      id_usuario: sol.id_instructor,
      id_creador: req.user.id,
    });
    return res.json({
      success: true,
      message: estado === 'Aprobada' ? 'Aprendiz creado y asignado al proyecto' : 'Solicitud rechazada',
      data: { id_usuario: idUsuario },
    });
  } catch (err) {
    if (conn) { try { await conn.rollback(); } catch { /* sin transacción abierta */ } }
    console.error(err); return res.status(500).json({ success: false, message: 'Error interno del servidor' });
  } finally {
    if (conn) conn.release();
  }
};

module.exports = { create, mias, getAll, resolver };
