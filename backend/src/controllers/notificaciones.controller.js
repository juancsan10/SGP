const db = require('../config/db');

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

module.exports = { getByUsuario, marcarLeida, marcarTodasLeidas };
