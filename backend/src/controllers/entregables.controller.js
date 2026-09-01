const db = require('../config/db');
const { registrarCambio } = require('../services/historial.service');

// POST /api/v1/entregables
const create = async (req, res) => {
  try {
    const { nombre, descripcion, fecha_entrega, url_drive, version, id_fase } = req.body;

    if (!nombre || !fecha_entrega || !id_fase) {
      return res.status(400).json({ success: false, message: 'nombre, fecha_entrega e id_fase son requeridos' });
    }

    const [result] = await db.query(
      `INSERT INTO entregables (nombre, descripcion, fecha_entrega, url_drive, version, estado, id_fase) VALUES (?, ?, ?, ?, ?, 'Pendiente', ?)`,
      [nombre, descripcion || null, fecha_entrega, url_drive || null, version || '1.0', id_fase]
    );

    await registrarCambio('entregables', result.insertId, 'INSERT', req.user?.id);
    return res.status(201).json({ success: true, message: 'Entregable creado', data: { id_entregable: result.insertId } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/v1/entregables/:id_fase
const getByFase = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT * FROM entregables WHERE id_fase = ? ORDER BY fecha_entrega ASC`,
      [req.params.id_fase]
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/v1/entregables/:id
const update = async (req, res) => {
  try {
    const { nombre, descripcion, fecha_entrega, fecha_entregado, estado, url_drive, version } = req.body;

    const [result] = await db.query(
      `UPDATE entregables SET nombre = COALESCE(?, nombre), descripcion = COALESCE(?, descripcion),
       fecha_entrega = COALESCE(?, fecha_entrega), fecha_entregado = COALESCE(?, fecha_entregado),
       estado = COALESCE(?, estado), url_drive = COALESCE(?, url_drive), version = COALESCE(?, version)
       WHERE id_entregable = ?`,
      [nombre, descripcion, fecha_entrega, fecha_entregado, estado, url_drive, version, req.params.id]
    );

    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Entregable no encontrado' });
    await registrarCambio('entregables', req.params.id, 'UPDATE', req.user?.id);
    return res.json({ success: true, message: 'Entregable actualizado' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/v1/entregables/:id
const remove = async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM entregables WHERE id_entregable = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Entregable no encontrado' });
    await registrarCambio('entregables', req.params.id, 'DELETE', req.user?.id);
    return res.json({ success: true, message: 'Entregable eliminado' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { create, getByFase, update, remove };
