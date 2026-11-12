// =====================================================
// controllers/notificaciones.controller.js
// Manejo de notificaciones con soporte en tiempo real (RF4.4 / HU-28)
// =====================================================
const db = require('../config/db');
const { registrarCambio } = require('../services/historial.service');
const realtimeService = require('../services/realtime.service');
const notificacionesService = require('../services/notificaciones.service');

// GET /api/v1/notificaciones/:id_usuario
const getByUsuario = async (req, res) => {
  try {
    // NUEVO: quién la envió (nombre y rol), para distinguir los avisos del Administrador.
    const [rows] = await db.query(
      `SELECT n.*, CONCAT(c.nombres,' ',c.apellidos) AS creador_nombre, rc.nombre_rol AS creador_rol
       FROM notificaciones n
       LEFT JOIN usuarios c ON c.id_usuario = n.id_creador
       LEFT JOIN roles rc ON rc.id_rol = c.id_rol
       WHERE n.id_usuario = ? ORDER BY n.fecha_envio DESC`,
      [req.params.id_usuario]
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err); return res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

// PUT /api/v1/notificaciones/:id — marcar como leída (RN-022)
const marcarLeida = async (req, res) => {
  try {
    const [[notif]] = await db.query(
      `SELECT id_usuario FROM notificaciones WHERE id_notificacion = ?`,
      [req.params.id]
    );
    if (!notif) return res.status(404).json({ success: false, message: 'Notificación no encontrada' });

    const [result] = await db.query(
      `UPDATE notificaciones SET leida = 1 WHERE id_notificacion = ?`,
      [req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Notificación no encontrada' });

    // Sincronizar en tiempo real entre sesiones del usuario
    realtimeService.emitirEventoUsuario(notif.id_usuario, 'NOTIFICACION_LEIDA', {
      id_notificacion: Number(req.params.id)
    });

    return res.json({ success: true, message: 'Notificación marcada como leída' });
  } catch (err) {
    console.error(err); return res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

// PUT /api/v1/notificaciones/leer-todas/:id_usuario
const marcarTodasLeidas = async (req, res) => {
  try {
    await db.query(
      `UPDATE notificaciones SET leida = 1 WHERE id_usuario = ?`,
      [req.params.id_usuario]
    );

    // Sincronizar en tiempo real entre sesiones del usuario
    realtimeService.emitirEventoUsuario(req.params.id_usuario, 'TODAS_LEIDAS', {
      id_usuario: Number(req.params.id_usuario)
    });

    return res.json({ success: true, message: 'Todas las notificaciones marcadas como leídas' });
  } catch (err) {
    console.error(err); return res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

// POST /api/v1/notificaciones/broadcast
// Administrador: a un usuario puntual, a todos los usuarios activos de un rol
//   (Aprendiz, Instructor o "Todos") o al equipo de un proyecto (id_proyecto).
// Instructor (NUEVO, punto 7): solo a sus aprendices —
//   rol_destino 'MisAprendices', el equipo de uno de sus proyectos
//   (id_proyecto) o un aprendiz de sus proyectos (id_usuario).
const TIPOS_VALIDOS = ['mantenimiento', 'advertencia', 'informativo', 'sistema'];
const PRIORIDADES_VALIDAS = ['Baja', 'Media', 'Alta'];

const broadcast = async (req, res) => {
  try {
    const { titulo, mensaje, tipo, prioridad, id_usuario, rol_destino, id_proyecto } = req.body;
    const esInstructor = req.user.rol === 'Instructor';

    if (!titulo || !mensaje) {
      return res.status(400).json({ success: false, message: 'titulo y mensaje son requeridos' });
    }
    if (!id_usuario && !rol_destino && !id_proyecto) {
      return res.status(400).json({ success: false, message: 'Debes indicar id_usuario, id_proyecto o rol_destino' });
    }
    const tipoFinal = TIPOS_VALIDOS.includes(tipo) ? tipo : 'informativo';
    const prioridadFinal = PRIORIDADES_VALIDAS.includes(prioridad) ? prioridad : 'Media';
    const fechaEnvio = new Date();

    let destinatarios = [];
    if (esInstructor) {
      const resultado = await destinatariosDelInstructor(req.user.id, { id_usuario, rol_destino, id_proyecto });
      if (resultado.error) return res.status(resultado.status).json({ success: false, message: resultado.error });
      destinatarios = resultado.ids;
    } else if (id_proyecto) {
      // Administrador: equipo del proyecto y su instructor responsable.
      const [rows] = await db.query(
        `SELECT DISTINCT x.id_usuario FROM (
           SELECT e.id_usuario FROM equipos_proyecto e WHERE e.id_proyecto = ?
           UNION SELECT p.id_instructor FROM proyectos p WHERE p.id_proyecto = ?
         ) x JOIN usuarios u ON u.id_usuario = x.id_usuario WHERE u.estado = 1`,
        [id_proyecto, id_proyecto]
      );
      destinatarios = rows.map(r => r.id_usuario);
    } else if (id_usuario) {
      destinatarios = [id_usuario];
    } else {
      const roles = rol_destino === 'Todos' ? ['Aprendiz', 'Instructor'] : [rol_destino];
      if (!roles.every(r => ['Aprendiz', 'Instructor'].includes(r))) {
        return res.status(400).json({ success: false, message: "rol_destino debe ser 'Aprendiz', 'Instructor' o 'Todos'" });
      }
      const [rows] = await db.query(
        `SELECT u.id_usuario FROM usuarios u JOIN roles r ON r.id_rol = u.id_rol WHERE r.nombre_rol IN (?) AND u.estado = 1`,
        [roles]
      );
      destinatarios = rows.map(r => r.id_usuario);
    }

    if (destinatarios.length === 0) {
      return res.status(404).json({ success: false, message: 'No se encontraron usuarios destinatarios' });
    }

    // Inserción en BD y notificación instantánea vía WebSocket/SSE a cada destinatario
    await notificacionesService.crearYNotificarMultiples({
      ids_usuarios: destinatarios,
      titulo,
      mensaje,
      tipo: tipoFinal,
      prioridad: prioridadFinal,
      id_creador: req.user.id,
      fecha_envio: fechaEnvio
    });

    await registrarCambio('notificaciones', null, `BROADCAST_${destinatarios.length}_USUARIOS`, req.user?.id);
    return res.status(201).json({
      success: true,
      message: `Notificación enviada a ${destinatarios.length} usuario(s) en tiempo real`,
      destinatariosCount: destinatarios.length
    });
  } catch (err) {
    console.error(err); return res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

// Destinatarios permitidos al Instructor: solo aprendices activos de sus proyectos.
const SQL_APRENDICES_INSTRUCTOR = `
  SELECT DISTINCT e.id_usuario FROM equipos_proyecto e
  JOIN proyectos p ON p.id_proyecto = e.id_proyecto
  JOIN usuarios u ON u.id_usuario = e.id_usuario
  JOIN roles r ON r.id_rol = u.id_rol
  WHERE p.id_instructor = ? AND u.estado = 1 AND r.nombre_rol = 'Aprendiz'`;

async function destinatariosDelInstructor(idInstructor, { id_usuario, rol_destino, id_proyecto }) {
  if (id_proyecto) {
    const [propio] = await db.query('SELECT id_proyecto FROM proyectos WHERE id_proyecto = ? AND id_instructor = ?', [id_proyecto, idInstructor]);
    if (!propio.length) return { status: 403, error: 'Solo puedes notificar a los equipos de tus proyectos' };
    const [rows] = await db.query(`${SQL_APRENDICES_INSTRUCTOR} AND p.id_proyecto = ?`, [idInstructor, id_proyecto]);
    return { ids: rows.map(r => r.id_usuario) };
  }
  if (id_usuario) {
    const [rows] = await db.query(`${SQL_APRENDICES_INSTRUCTOR} AND e.id_usuario = ?`, [idInstructor, id_usuario]);
    if (!rows.length) return { status: 403, error: 'Solo puedes notificar a aprendices de tus proyectos' };
    return { ids: [rows[0].id_usuario] };
  }
  if (rol_destino === 'MisAprendices') {
    const [rows] = await db.query(SQL_APRENDICES_INSTRUCTOR, [idInstructor]);
    return { ids: rows.map(r => r.id_usuario) };
  }
  return { status: 403, error: 'Como instructor solo puedes notificar a tus aprendices, a un proyecto tuyo o a un aprendiz' };
}

// GET /api/v1/notificaciones/enviadas  (Administrador e Instructor: lo que él creó)
const getEnviadas = async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 50);
    const offset = Math.max(Number(req.query.offset) || 0, 0);

    const [rows] = await db.query(
      `SELECT MIN(n.id_notificacion) AS id_notificacion, n.titulo, n.mensaje, n.tipo, n.prioridad, n.fecha_envio,
              COUNT(*) AS total_destinatarios,
              SUM(n.leida) AS total_leidas,
              GROUP_CONCAT(DISTINCT CONCAT(u.nombres,' ',u.apellidos) ORDER BY u.nombres SEPARATOR ', ') AS destinatarios
       FROM notificaciones n
       JOIN usuarios u ON u.id_usuario = n.id_usuario
       WHERE n.id_creador = ?
       GROUP BY n.titulo, n.mensaje, n.tipo, n.prioridad, n.fecha_envio
       ORDER BY n.fecha_envio DESC
       LIMIT ? OFFSET ?`,
      [req.user.id, limit, offset]
    );

    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM (
         SELECT 1 FROM notificaciones WHERE id_creador = ?
         GROUP BY titulo, mensaje, tipo, prioridad, fecha_envio
       ) agrupado`,
      [req.user.id]
    );

    return res.json({ success: true, data: rows, meta: { total, limit, offset } });
  } catch (err) {
    console.error(err); return res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

// GET /api/v1/notificaciones/stream — Canal Server-Sent Events (SSE) secundario
const stream = (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  realtimeService.registerSseClient(req.user.id, res);

  res.write(`data: ${JSON.stringify({ type: 'CONECTADO_SSE', id_usuario: req.user.id })}\n\n`);

  const keepAlive = setInterval(() => {
    res.write(': keep-alive\n\n');
  }, 25000);

  req.on('close', () => {
    clearInterval(keepAlive);
  });
};

// GET /api/v1/notificaciones/realtime/stats — Métricas de conexiones en vivo
const stats = (req, res) => {
  return res.json({ success: true, data: realtimeService.getStats() });
};

module.exports = {
  getByUsuario,
  marcarLeida,
  marcarTodasLeidas,
  broadcast,
  getEnviadas,
  stream,
  stats
};
