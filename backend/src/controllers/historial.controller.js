const db = require('../config/db');

// GET /api/v1/historial/:tabla
const getByTabla = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT h.*, CONCAT(u.nombres, ' ', u.apellidos) AS usuario_nombre
       FROM historial_cambios h
       LEFT JOIN usuarios u ON h.id_usuario = u.id_usuario
       WHERE h.tabla_afectada = ? ORDER BY h.fecha_cambio DESC LIMIT 100`,
      [req.params.tabla]
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err); return res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

// GET /api/v1/historial
const getAll = async (req, res) => {
  try { const limit=Math.min(Math.max(Number(req.query.limit)||50,1),100); const offset=Math.max(Number(req.query.offset)||0,0);
    const [rows] = await db.query(
      `SELECT h.*, CONCAT(u.nombres, ' ', u.apellidos) AS usuario_nombre
       FROM historial_cambios h
       LEFT JOIN usuarios u ON h.id_usuario = u.id_usuario
       ORDER BY h.fecha_cambio DESC LIMIT 200`
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err); return res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

module.exports = { getByTabla, getAll };
