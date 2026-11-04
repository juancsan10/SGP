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
    const [rows] = await db.query(
      `SELECT * FROM notificaciones WHERE id_usuario = ? ORDER BY fecha_envio DESC`,
      [req.params.id_usuario]
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
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
    return res.status(500).json({ success: false, message: err.message });
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
    return res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/v1/notificaciones/broadcast  (NUEVO — solo Administrador)
// Envía una notificación a un usuario puntual o a todos los usuarios
// activos de un rol (Aprendiz, Instructor, o ambos con "Todos").
const TIPOS_VALIDOS = ['mantenimiento', 'advertencia', 'informativo', 'sistema'];
const PRIORIDADES_VALIDAS = ['Baja', 'Media', 'Alta'];

const broadcast = async (req, res) => {
  try {
    const { titulo, mensaje, tipo, prioridad, id_usuario, rol_destino } = req.body;

    if (!titulo || !mensaje) {
      return res.status(400).json({ success: false, message: 'titulo y mensaje son requeridos' });
    }
    if (!id_usuario && !rol_destino) {
      return res.status(400).json({ success: false, message: 'Debes indicar id_usuario o rol_destino' });
    }
    const tipoFinal = TIPOS_VALIDOS.includes(tipo) ? tipo : 'informativo';
    const prioridadFinal = PRIORIDADES_VALIDAS.includes(prioridad) ? prioridad : 'Media';
    const fechaEnvio = new Date();

    let destinatarios = [];
    if (id_usuario) {
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
    return res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/v1/notificaciones/enviadas  (NUEVO — solo Administrador)
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
    return res.status(500).json({ success: false, message: err.message });
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
