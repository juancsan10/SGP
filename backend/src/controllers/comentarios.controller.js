const db = require('../config/db');
const { registrarCambio } = require('../services/historial.service');

// POST /api/v1/comentarios
// RN-015: Retroalimentación — cualquier miembro del equipo (instructor o
// aprendiz) puede comentar el avance de un entregable.
const create = async (req, res) => {
  try {
    const { contenido, id_entregable } = req.body;
    const id_usuario = req.user.id;

    if (!contenido || !id_entregable) {
      return res.status(400).json({ success: false, message: 'contenido e id_entregable son requeridos' });
    }

    const [result] = await db.query(
      `INSERT INTO comentarios (contenido, id_usuario, id_entregable) VALUES (?, ?, ?)`,
      [contenido, id_usuario, id_entregable]
    );

    await registrarCambio('comentarios', result.insertId, 'INSERT', id_usuario);
    return res.status(201).json({ success: true, message: 'Comentario agregado', data: { id_comentario: result.insertId } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/v1/comentarios/:id_entregable
const getByEntregable = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT c.*, CONCAT(u.nombres, ' ', u.apellidos) AS autor_nombre, r.nombre_rol AS autor_rol
       FROM comentarios c
       JOIN usuarios u ON c.id_usuario = u.id_usuario
       JOIN roles r ON u.id_rol = r.id_rol
       WHERE c.id_entregable = ? ORDER BY c.fecha_comentario ASC`,
      [req.params.id_entregable]
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/v1/comentarios/:id — solo el autor puede editar su propio comentario
const update = async (req, res) => {
  try {
    const { contenido } = req.body;
    const [comentario] = await db.query('SELECT id_usuario FROM comentarios WHERE id_comentario = ?', [req.params.id]);
    if (comentario.length === 0) return res.status(404).json({ success: false, message: 'Comentario no encontrado' });
    if (comentario[0].id_usuario !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Solo puedes editar tus propios comentarios' });
    }

    await db.query('UPDATE comentarios SET contenido = ? WHERE id_comentario = ?', [contenido, req.params.id]);
    await registrarCambio('comentarios', req.params.id, 'UPDATE', req.user.id);
    return res.json({ success: true, message: 'Comentario actualizado' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/v1/comentarios/:id — el autor o un Administrador pueden borrar
const remove = async (req, res) => {
  try {
    const [comentario] = await db.query('SELECT id_usuario FROM comentarios WHERE id_comentario = ?', [req.params.id]);
    if (comentario.length === 0) return res.status(404).json({ success: false, message: 'Comentario no encontrado' });
    if (comentario[0].id_usuario !== req.user.id && req.user.rol !== 'Administrador') {
      return res.status(403).json({ success: false, message: 'No tienes permisos para borrar este comentario' });
    }

    await db.query('DELETE FROM comentarios WHERE id_comentario = ?', [req.params.id]);
    await registrarCambio('comentarios', req.params.id, 'DELETE', req.user.id);
    return res.json({ success: true, message: 'Comentario eliminado' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { create, getByEntregable, update, remove };
