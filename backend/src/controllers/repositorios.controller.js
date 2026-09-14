const db = require('../config/db');
const { registrarCambio } = require('../services/historial.service');

// POST /api/v1/repositorios
const create = async (req, res) => {
  try {
    const { url_github, rama_principal, id_proyecto } = req.body;

    if (!url_github || !id_proyecto) {
      return res.status(400).json({ success: false, message: 'url_github e id_proyecto son requeridos' });
    }

    const [result] = await db.query(
      `INSERT INTO repositorios (url_github, rama_principal, ultima_actualizacion, id_proyecto) VALUES (?, ?, NOW(), ?)`,
      [url_github, rama_principal || 'main', id_proyecto]
    );

    await registrarCambio('repositorios', result.insertId, 'INSERT', req.user?.id);
    return res.status(201).json({ success: true, message: 'Repositorio vinculado', data: { id_repositorio: result.insertId } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/v1/repositorios/:id_proyecto
const getByProyecto = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT * FROM repositorios WHERE id_proyecto = ?`,
      [req.params.id_proyecto]
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/v1/repositorios/:id
const update = async (req, res) => {
  try {
    const { url_github, rama_principal } = req.body;
    const [result] = await db.query(
      `UPDATE repositorios SET url_github = COALESCE(?, url_github), rama_principal = COALESCE(?, rama_principal), ultima_actualizacion = NOW() WHERE id_repositorio = ?`,
      [url_github, rama_principal, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Repositorio no encontrado' });
    return res.json({ success: true, message: 'Repositorio actualizado' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { create, getByProyecto, update };
