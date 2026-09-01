const db = require('../config/db');
const { registrarCambio } = require('../services/historial.service');

// POST /api/v1/reuniones
const create = async (req, res) => {
  try {
    const { titulo, descripcion, fecha_reunion, lugar, id_proyecto } = req.body;

    if (!titulo || !fecha_reunion || !id_proyecto) {
      return res.status(400).json({ success: false, message: 'titulo, fecha_reunion e id_proyecto son requeridos' });
    }

    const [result] = await db.query(
      `INSERT INTO reuniones (titulo, descripcion, fecha_reunion, lugar, id_proyecto) VALUES (?, ?, ?, ?, ?)`,
      [titulo, descripcion || null, fecha_reunion, lugar || null, id_proyecto]
    );

    // Notificar a los miembros del equipo del proyecto (RN-021)
    const [miembros] = await db.query(
      `SELECT DISTINCT id_usuario FROM equipos_proyecto WHERE id_proyecto = ?`,
      [id_proyecto]
    );
    const notifPromises = miembros.map(m =>
      db.query(
        `INSERT INTO notificaciones (titulo, mensaje, tipo, id_usuario) VALUES ('Nueva reunión programada', ?, 'sistema', ?)`,
        [`${titulo} — ${new Date(fecha_reunion).toLocaleString('es-CO')}`, m.id_usuario]
      )
    );
    await Promise.all(notifPromises);

    await registrarCambio('reuniones', result.insertId, 'INSERT', req.user?.id);
    return res.status(201).json({ success: true, message: 'Reunión programada', data: { id_reunion: result.insertId } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/v1/reuniones/:id_proyecto
const getByProyecto = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT * FROM reuniones WHERE id_proyecto = ? ORDER BY fecha_reunion ASC`,
      [req.params.id_proyecto]
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/v1/reuniones/:id
const update = async (req, res) => {
  try {
    const { titulo, descripcion, fecha_reunion, lugar } = req.body;
    const [result] = await db.query(
      `UPDATE reuniones SET titulo = COALESCE(?, titulo), descripcion = COALESCE(?, descripcion),
       fecha_reunion = COALESCE(?, fecha_reunion), lugar = COALESCE(?, lugar) WHERE id_reunion = ?`,
      [titulo, descripcion, fecha_reunion, lugar, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Reunión no encontrada' });
    await registrarCambio('reuniones', req.params.id, 'UPDATE', req.user?.id);
    return res.json({ success: true, message: 'Reunión actualizada' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/v1/reuniones/:id
const remove = async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM reuniones WHERE id_reunion = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Reunión no encontrada' });
    await registrarCambio('reuniones', req.params.id, 'DELETE', req.user?.id);
    return res.json({ success: true, message: 'Reunión cancelada' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { create, getByProyecto, update, remove };
