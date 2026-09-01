const db = require('../config/db');
const { registrarCambio } = require('../services/historial.service');

// POST /api/v1/fases
const create = async (req, res) => {
  try {
    const { nombre_fase, descripcion, fecha_inicio, fecha_fin, id_proyecto } = req.body;

    if (!nombre_fase || !id_proyecto) {
      return res.status(400).json({ success: false, message: 'nombre_fase e id_proyecto son requeridos' });
    }

    const [result] = await db.query(
      `INSERT INTO fases_proyecto (nombre_fase, descripcion, fecha_inicio, fecha_fin, id_proyecto) VALUES (?, ?, ?, ?, ?)`,
      [nombre_fase, descripcion || null, fecha_inicio || null, fecha_fin || null, id_proyecto]
    );

    await registrarCambio('fases_proyecto', result.insertId, 'INSERT', req.user?.id);
    return res.status(201).json({ success: true, message: 'Fase creada', data: { id_fase: result.insertId } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/v1/fases/:id_proyecto
const getByProyecto = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT * FROM fases_proyecto WHERE id_proyecto = ? ORDER BY fecha_inicio ASC`,
      [req.params.id_proyecto]
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/v1/fases/:id
const update = async (req, res) => {
  try {
    const { nombre_fase, descripcion, fecha_inicio, fecha_fin, porcentaje_avance } = req.body;

    // RN-013
    if (porcentaje_avance !== undefined && (porcentaje_avance < 0 || porcentaje_avance > 100)) {
      return res.status(400).json({ success: false, message: 'RN-013: El avance debe estar entre 0% y 100%' });
    }

    const [result] = await db.query(
      `UPDATE fases_proyecto SET nombre_fase = COALESCE(?, nombre_fase), descripcion = COALESCE(?, descripcion),
       fecha_inicio = COALESCE(?, fecha_inicio), fecha_fin = COALESCE(?, fecha_fin),
       porcentaje_avance = COALESCE(?, porcentaje_avance) WHERE id_fase = ?`,
      [nombre_fase, descripcion, fecha_inicio, fecha_fin, porcentaje_avance, req.params.id]
    );

    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Fase no encontrada' });
    await registrarCambio('fases_proyecto', req.params.id, 'UPDATE', req.user?.id);
    return res.json({ success: true, message: 'Fase actualizada' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/v1/fases/:id
const remove = async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM fases_proyecto WHERE id_fase = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Fase no encontrada' });
    await registrarCambio('fases_proyecto', req.params.id, 'DELETE', req.user?.id);
    return res.json({ success: true, message: 'Fase eliminada' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { create, getByProyecto, update, remove };
