const db = require('../config/db');
const { registrarCambio } = require('../services/historial.service');

// POST /api/v1/archivos
// Por ahora solo registra la referencia (nombre + ruta) del archivo; la
// subida física del binario queda pendiente para una fase posterior (ver
// backend/README.md, sección de almacenamiento).
const create = async (req, res) => {
  try {
    const { nombre_archivo, ruta_archivo, id_entregable } = req.body;

    if (!nombre_archivo || !ruta_archivo || !id_entregable) {
      return res.status(400).json({ success: false, message: 'nombre_archivo, ruta_archivo e id_entregable son requeridos' });
    }

    const [result] = await db.query(
      `INSERT INTO archivos (nombre_archivo, ruta_archivo, id_entregable) VALUES (?, ?, ?)`,
      [nombre_archivo, ruta_archivo, id_entregable]
    );

    await registrarCambio('archivos', result.insertId, 'INSERT', req.user?.id);
    return res.status(201).json({ success: true, message: 'Archivo registrado', data: { id_archivo: result.insertId } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/v1/archivos/:id_entregable
const getByEntregable = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT * FROM archivos WHERE id_entregable = ? ORDER BY fecha_subida DESC`,
      [req.params.id_entregable]
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/v1/archivos/:id
const remove = async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM archivos WHERE id_archivo = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Archivo no encontrado' });
    await registrarCambio('archivos', req.params.id, 'DELETE', req.user?.id);
    return res.json({ success: true, message: 'Archivo eliminado' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { create, getByEntregable, remove };
