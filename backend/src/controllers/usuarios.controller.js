const db = require('../config/db');
const bcrypt = require('bcryptjs');
const { registrarCambio } = require('../services/historial.service');

// GET /api/v1/usuarios
const getAll = async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100);
    const offset = Math.max(Number(req.query.offset) || 0, 0);
    const [rows] = await db.query(
      `SELECT u.id_usuario, u.nombres, u.apellidos, u.correo, u.ficha, u.programa_formacion, u.estado, u.fecha_registro, r.nombre_rol AS rol
       FROM usuarios u JOIN roles r ON u.id_rol = r.id_rol ORDER BY u.fecha_registro DESC LIMIT ? OFFSET ?`, [limit, offset]
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Error interno del servidor' });
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
    return res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

// PUT /api/v1/usuarios/:id
const update = async (req, res) => {
  try {
    const { nombres, apellidos, ficha, programa_formacion } = req.body;
    const { id } = req.params;

    const query = `UPDATE usuarios SET nombres = COALESCE(?, nombres), apellidos = COALESCE(?, apellidos), ficha = COALESCE(?, ficha), programa_formacion = COALESCE(?, programa_formacion) WHERE id_usuario = ?`;
    const params = [nombres ?? null, apellidos ?? null, ficha ?? null, programa_formacion ?? null, id];

    const [result] = await db.query(query, params);
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });

    await registrarCambio('usuarios', id, 'UPDATE', req.user?.id);
    return res.json({ success: true, message: 'Usuario actualizado' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Error interno del servidor' });
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
    return res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};


const changePassword = async (req,res) => {
  try {
    const {actual,nueva} = req.body;
    if(!actual || !nueva || nueva.length < 8) return res.status(400).json({success:false,message:'Contraseña actual y nueva (mínimo 8 caracteres) son requeridas'});
    const [rows] = await db.query('SELECT contrasena FROM usuarios WHERE id_usuario=? AND estado=1',[req.user.id]);
    if(!rows.length || !(await bcrypt.compare(actual, rows[0].contrasena))) return res.status(400).json({success:false,message:'La contraseña actual no es correcta'});
    const hash=await bcrypt.hash(nueva,10); await db.query('UPDATE usuarios SET contrasena=? WHERE id_usuario=?',[hash,req.user.id]);
    await registrarCambio('usuarios',req.user.id,'PASSWORD_CHANGE',req.user.id);
    res.json({success:true,message:'Contraseña actualizada'});
  } catch(err){console.error(err);res.status(500).json({success:false,message:'Error interno del servidor'});}
};
module.exports = { getAll, getById, update, remove, changePassword };
