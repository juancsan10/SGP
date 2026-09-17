const db = require('../config/db');

// POST /api/v1/mensajes
const create = async (req, res) => {
  try {
    const { contenido, id_proyecto } = req.body;
    const id_remitente = req.user.id;

    if (!contenido || !id_proyecto) {
      return res.status(400).json({ success: false, message: 'contenido e id_proyecto son requeridos' });
    }

    const [result] = await db.query(
      `INSERT INTO mensajes (contenido, id_remitente, id_proyecto) VALUES (?, ?, ?)`,
      [contenido, id_remitente, id_proyecto]
    );

    // Notificar a los miembros del proyecto (RN-021)
    const [miembros] = await db.query(
      `SELECT DISTINCT id_usuario FROM equipos_proyecto WHERE id_proyecto = ? AND id_usuario != ?`,
      [id_proyecto, id_remitente]
    );

    const notifPromises = miembros.map(m =>
      db.query(
        `INSERT INTO notificaciones (titulo, mensaje, tipo, id_usuario) VALUES ('Nuevo mensaje', ?, 'mensaje', ?)`,
        [contenido.substring(0, 100), m.id_usuario]
      )
    );
    await Promise.all(notifPromises);

    return res.status(201).json({ success: true, message: 'Mensaje enviado', data: { id_mensaje: result.insertId } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/v1/mensajes/:id_proyecto
const getByProyecto = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT m.*, CONCAT(u.nombres, ' ', u.apellidos) AS remitente_nombre
       FROM mensajes m JOIN usuarios u ON m.id_remitente = u.id_usuario
       WHERE m.id_proyecto = ? ORDER BY m.fecha_envio ASC`,
      [req.params.id_proyecto]
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { create, getByProyecto };
