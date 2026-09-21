const db = require('../config/db');
const { registrarCambio } = require('../services/historial.service');

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
    const [result] = await db.query(
      `UPDATE notificaciones SET leida = 1 WHERE id_notificacion = ?`,
      [req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Notificación no encontrada' });
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

    await Promise.all(destinatarios.map(id =>
      db.query(
        `INSERT INTO notificaciones (titulo, mensaje, tipo, prioridad, id_usuario) VALUES (?, ?, ?, ?, ?)`,
        [titulo, mensaje, tipoFinal, prioridadFinal, id]
      )
    ));

    await registrarCambio('notificaciones', null, `BROADCAST_${destinatarios.length}_USUARIOS`, req.user?.id);
    return res.status(201).json({ success: true, message: `Notificación enviada a ${destinatarios.length} usuario(s)` });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getByUsuario, marcarLeida, marcarTodasLeidas, broadcast };
