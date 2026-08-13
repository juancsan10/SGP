const db = require('../config/db');
const bcrypt = require('bcryptjs');
const { registrarCambio } = require('../services/historial.service');

// GET /api/v1/usuarios
const getAll = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT u.id_usuario, u.nombres, u.apellidos, u.correo, u.ficha, u.programa_formacion, u.estado, u.fecha_registro, r.nombre_rol AS rol
       FROM usuarios u JOIN roles r ON u.id_rol = r.id_rol ORDER BY u.fecha_registro DESC`
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/v1/usuarios/:id
const getById = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT u.id_usuario, u.nombres, u.apellidos, u.correo, u.ficha, u.programa_formacion, u.estado, u.fecha_registro, r.nombre_rol AS rol
       FROM usuarios u JOIN roles r ON u.id_rol = r.id_rol WHERE u.id_usuario = ?`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/v1/usuarios/:id
const update = async (req, res) => {
  try {
    const { nombres, apellidos, ficha, programa_formacion, contrasena } = req.body;
    const { id } = req.params;

    let query = `UPDATE usuarios SET nombres = ?, apellidos = ?, ficha = ?, programa_formacion = ? WHERE id_usuario = ?`;
    let params = [nombres, apellidos, ficha, programa_formacion, id];

    if (contrasena) {
      const hashed = await bcrypt.hash(contrasena, 10);
      query = `UPDATE usuarios SET nombres = ?, apellidos = ?, ficha = ?, programa_formacion = ?, contrasena = ? WHERE id_usuario = ?`;
      params = [nombres, apellidos, ficha, programa_formacion, hashed, id];
    }

    const [result] = await db.query(query, params);
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });

    await registrarCambio('usuarios', id, 'UPDATE', req.user?.id);
    return res.json({ success: true, message: 'Usuario actualizado' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/v1/usuarios/:id  — desactivación lógica (RN-007)
const remove = async (req, res) => {
  try {
    const [result] = await db.query(
      `UPDATE usuarios SET estado = 0 WHERE id_usuario = ?`,
      [req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    await registrarCambio('usuarios', req.params.id, 'DELETE', req.user?.id);
    return res.json({ success: true, message: 'Usuario desactivado' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getAll, getById, update, remove };
