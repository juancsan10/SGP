const db = require('../config/db');
const { registrarCambio } = require('../services/historial.service');

// Nunca se debe exponer github_token en ninguna respuesta JSON.
const SELECT_SEGURO = 'id_integration, github_username, fecha_integracion, id_usuario';

// POST /api/v1/github-integration — el propio usuario conecta su cuenta
const create = async (req, res) => {
  try {
    const { github_username, github_token } = req.body;
    const id_usuario = req.user.id;

    if (!github_username || !github_token) {
      return res.status(400).json({ success: false, message: 'github_username y github_token son requeridos' });
    }

    const [existente] = await db.query('SELECT id_integration FROM github_integration WHERE id_usuario = ?', [id_usuario]);
    if (existente.length > 0) {
      return res.status(400).json({ success: false, message: 'Ya tienes una cuenta de GitHub vinculada. Usa PUT para actualizarla.' });
    }

    const [result] = await db.query(
      `INSERT INTO github_integration (github_username, github_token, id_usuario) VALUES (?, ?, ?)`,
      [github_username, github_token, id_usuario]
    );

    await registrarCambio('github_integration', result.insertId, 'INSERT', id_usuario);
    return res.status(201).json({ success: true, message: 'Cuenta de GitHub vinculada', data: { id_integration: result.insertId } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/v1/github-integration/:id_usuario — solo el propio usuario o un Administrador
const getByUsuario = async (req, res) => {
  try {
    const idSolicitado = parseInt(req.params.id_usuario, 10);
    if (req.user.id !== idSolicitado && req.user.rol !== 'Administrador') {
      return res.status(403).json({ success: false, message: 'No tienes permisos para ver esta integración' });
    }

    const [rows] = await db.query(
      `SELECT ${SELECT_SEGURO} FROM github_integration WHERE id_usuario = ?`,
      [idSolicitado]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Este usuario no ha vinculado GitHub aún' });
    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/v1/github-integration — el propio usuario actualiza su vínculo
const update = async (req, res) => {
  try {
    const { github_username, github_token } = req.body;
    const id_usuario = req.user.id;

    const [result] = await db.query(
      `UPDATE github_integration SET github_username = COALESCE(?, github_username),
       github_token = COALESCE(?, github_token), fecha_integracion = NOW() WHERE id_usuario = ?`,
      [github_username, github_token, id_usuario]
    );
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'No tienes una integración de GitHub para actualizar' });

    await registrarCambio('github_integration', id_usuario, 'UPDATE', id_usuario);
    return res.json({ success: true, message: 'Integración de GitHub actualizada' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/v1/github-integration — el propio usuario desvincula su cuenta
const remove = async (req, res) => {
  try {
    const id_usuario = req.user.id;
    const [result] = await db.query('DELETE FROM github_integration WHERE id_usuario = ?', [id_usuario]);
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'No tienes una integración de GitHub para eliminar' });
    await registrarCambio('github_integration', id_usuario, 'DELETE', id_usuario);
    return res.json({ success: true, message: 'Cuenta de GitHub desvinculada' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { create, getByUsuario, update, remove };
