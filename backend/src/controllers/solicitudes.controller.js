// =====================================================
// controllers/solicitudes.controller.js  (NUEVO)
// Solicitudes que un Instructor o un Aprendiz dirige al Administrador.
// El Administrador las atiende o rechaza desde su panel de control, con
// una respuesta que le llega al solicitante como notificación.
// =====================================================
const db = require('../config/db');
const { registrarCambio } = require('../services/historial.service');

const TIPOS = ['Actualización de datos', 'Soporte técnico', 'Acceso o cuenta', 'Proyecto o equipo', 'Otro'];
const ESTADOS = ['Pendiente', 'Atendida', 'Rechazada'];

const SELECT_BASE = `
  SELECT s.*, CONCAT(u.nombres,' ',u.apellidos) AS solicitante_nombre, u.correo AS solicitante_correo,
         u.identificacion AS solicitante_cc, r.nombre_rol AS solicitante_rol,
         p.nombre AS proyecto_nombre,
         CONCAT(a.nombres,' ',a.apellidos) AS admin_nombre
  FROM solicitudes s
  JOIN usuarios u ON u.id_usuario = s.id_solicitante
  JOIN roles r ON r.id_rol = u.id_rol
  LEFT JOIN proyectos p ON p.id_proyecto = s.id_proyecto
  LEFT JOIN usuarios a ON a.id_usuario = s.id_admin_resuelve`;

// GET /api/v1/solicitudes/tipos
const tipos = (req, res) => res.json({ success: true, data: TIPOS });

// POST /api/v1/solicitudes  (Instructor, Aprendiz)
const create = async (req, res) => {
  try {
    const tipo = String(req.body.tipo || '').trim();
    const asunto = String(req.body.asunto || '').trim();
    const descripcion = String(req.body.descripcion || '').trim();
    const idProyecto = req.body.id_proyecto ? Number(req.body.id_proyecto) : null;

    if (!TIPOS.includes(tipo)) return res.status(400).json({ success: false, message: 'Tipo de solicitud inválido' });
    if (asunto.length < 5 || asunto.length > 150) return res.status(400).json({ success: false, message: 'El asunto debe tener entre 5 y 150 caracteres' });
    if (descripcion.length < 10 || descripcion.length > 5000) return res.status(400).json({ success: false, message: 'La descripción debe tener entre 10 y 5000 caracteres' });

    if (idProyecto) {
      // Solo puede asociar proyectos en los que participa.
      const [ok] = req.user.rol === 'Instructor'
        ? await db.query('SELECT id_proyecto FROM proyectos WHERE id_proyecto = ? AND id_instructor = ?', [idProyecto, req.user.id])
        : await db.query('SELECT id_proyecto FROM equipos_proyecto WHERE id_proyecto = ? AND id_usuario = ?', [idProyecto, req.user.id]);
      if (!ok.length) return res.status(403).json({ success: false, message: 'Solo puedes asociar proyectos en los que participas' });
    }

    const [r] = await db.query(
      `INSERT INTO solicitudes (id_solicitante, tipo, asunto, descripcion, id_proyecto) VALUES (?, ?, ?, ?, ?)`,
      [req.user.id, tipo, asunto, descripcion, idProyecto]);

    // Aviso al Administrador (único) en sus notificaciones.
    await db.query(
      `INSERT INTO notificaciones (titulo, mensaje, tipo, prioridad, id_usuario)
       SELECT ?, ?, 'sistema', 'Media', u.id_usuario FROM usuarios u JOIN roles r ON r.id_rol = u.id_rol
       WHERE r.nombre_rol = 'Administrador' AND u.estado = 1`,
      [`Nueva solicitud: ${tipo}`, `${asunto} — revísala en la sección Solicitudes del panel de control.`]);

    await registrarCambio('solicitudes', r.insertId, 'INSERT', req.user.id);
    return res.status(201).json({ success: true, message: 'Solicitud enviada al Administrador', data: { id_solicitud: r.insertId } });
  } catch (err) {
    console.error(err); return res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

// GET /api/v1/solicitudes/mias  (Instructor, Aprendiz)
const mias = async (req, res) => {
  try {
    const [rows] = await db.query(`${SELECT_BASE} WHERE s.id_solicitante = ? ORDER BY s.fecha_solicitud DESC LIMIT 50`, [req.user.id]);
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err); return res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

// GET /api/v1/solicitudes  (Administrador) — filtros: estado, tipo, rol, q
const getAll = async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 100);
    const offset = Math.max(Number(req.query.offset) || 0, 0);
    const { estado, tipo, rol, q } = req.query;
    const cond = [], params = [];
    if (estado && ESTADOS.includes(estado)) { cond.push('s.estado = ?'); params.push(estado); }
    if (tipo && TIPOS.includes(tipo)) { cond.push('s.tipo = ?'); params.push(tipo); }
    if (rol && ['Instructor', 'Aprendiz'].includes(rol)) { cond.push('r.nombre_rol = ?'); params.push(rol); }
    if (q) {
      cond.push("(s.asunto LIKE ? OR s.descripcion LIKE ? OR CONCAT(u.nombres,' ',u.apellidos) LIKE ? OR u.identificacion LIKE ?)");
      params.push(...Array(4).fill(`%${q}%`));
    }
    const where = cond.length ? `WHERE ${cond.join(' AND ')}` : '';
    const [rows] = await db.query(
      `${SELECT_BASE} ${where}
       ORDER BY (s.estado = 'Pendiente') DESC, s.fecha_solicitud DESC LIMIT ? OFFSET ?`, [...params, limit, offset]);
    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM solicitudes s JOIN usuarios u ON u.id_usuario = s.id_solicitante
       JOIN roles r ON r.id_rol = u.id_rol ${where}`, params);
    const [conteos] = await db.query('SELECT estado, COUNT(*) AS total FROM solicitudes GROUP BY estado');
    const resumen = Object.fromEntries(ESTADOS.map(e => [e, 0]));
    conteos.forEach(c => { resumen[c.estado] = Number(c.total); });
    return res.json({ success: true, data: rows, meta: { total, limit, offset, resumen } });
  } catch (err) {
    console.error(err); return res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

// PUT /api/v1/solicitudes/:id/resolver  (Administrador)
// body: { estado: 'Atendida' | 'Rechazada', respuesta }
const resolver = async (req, res) => {
  try {
    const estado = req.body.estado;
    const respuesta = String(req.body.respuesta || '').trim();
    if (!['Atendida', 'Rechazada'].includes(estado)) return res.status(400).json({ success: false, message: 'El estado debe ser Atendida o Rechazada' });
    if (respuesta.length < 5) return res.status(400).json({ success: false, message: 'Escribe una respuesta para el solicitante (mínimo 5 caracteres)' });

    const [[sol]] = await db.query('SELECT * FROM solicitudes WHERE id_solicitud = ?', [req.params.id]);
    if (!sol) return res.status(404).json({ success: false, message: 'Solicitud no encontrada' });
    if (sol.estado !== 'Pendiente') return res.status(409).json({ success: false, message: 'La solicitud ya fue resuelta' });

    await db.query(
      `UPDATE solicitudes SET estado = ?, respuesta_admin = ?, id_admin_resuelve = ?, fecha_resolucion = NOW() WHERE id_solicitud = ?`,
      [estado, respuesta, req.user.id, sol.id_solicitud]);
    await db.query(
      `INSERT INTO notificaciones (titulo, mensaje, tipo, prioridad, id_usuario, id_creador) VALUES (?, ?, 'sistema', 'Media', ?, ?)`,
      [`Tu solicitud fue ${estado.toLowerCase()}`, `"${sol.asunto}": ${respuesta}`, sol.id_solicitante, req.user.id]);
    await registrarCambio('solicitudes', sol.id_solicitud, estado.toUpperCase(), req.user.id);
    return res.json({ success: true, message: `Solicitud ${estado.toLowerCase()}` });
  } catch (err) {
    console.error(err); return res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

module.exports = { tipos, create, mias, getAll, resolver };
