const db = require('../config/db');
const bcrypt = require('bcryptjs');
const { registrarCambio } = require('../services/historial.service');

// GET /api/v1/usuarios
// NUEVO: filtros por rol, estado y búsqueda de texto (nombre, apellido,
// identificación o correo) — antes solo soportaba paginación simple.
const getAll = async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100);
    const offset = Math.max(Number(req.query.offset) || 0, 0);
    const { rol, estado, q } = req.query;

    const condiciones = [];
    const params = [];
    if (rol) { condiciones.push('r.nombre_rol = ?'); params.push(rol); }
    if (estado !== undefined && estado !== '') { condiciones.push('u.estado = ?'); params.push(estado === 'true' || estado === '1' ? 1 : 0); }
    if (q) {
      condiciones.push('(u.nombres LIKE ? OR u.apellidos LIKE ? OR u.identificacion LIKE ? OR u.correo LIKE ?)');
      const like = `%${q}%`;
      params.push(like, like, like, like);
    }
    const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';

    const [rows] = await db.query(
      `SELECT u.id_usuario, u.nombres, u.apellidos, u.identificacion, u.correo, u.ficha, u.programa_formacion, u.estado, u.fecha_registro, r.nombre_rol AS rol
       FROM usuarios u JOIN roles r ON u.id_rol = r.id_rol ${where}
       ORDER BY u.fecha_registro DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM usuarios u JOIN roles r ON u.id_rol = r.id_rol ${where}`,
      params
    );
    return res.json({ success: true, data: rows, meta: { total, limit, offset } });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

// GET /api/v1/usuarios/:id
const getById = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT u.id_usuario, u.nombres, u.apellidos, u.identificacion, u.correo, u.ficha, u.programa_formacion, u.estado, u.fecha_registro, r.nombre_rol AS rol
       FROM usuarios u JOIN roles r ON u.id_rol = r.id_rol WHERE u.id_usuario = ?`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

// GET /api/v1/usuarios/buscar?identificacion=...&rol=...
// CORREGIDO: antes solo buscaba Aprendices (searchAprendizByIdentificacion).
// Ahora busca en cualquier rol — Aprendiz, Instructor o Administrador —
// opcionalmente filtrado por rol si se indica.
const buscarPorIdentificacion = async (req, res) => {
  try {
    const identificacion = String(req.query.identificacion || '').trim();
    const rol = req.query.rol;
    if (!identificacion || !/^[A-Za-z0-9.-]{4,30}$/.test(identificacion)) {
      return res.status(400).json({ success: false, message: 'Identificación inválida' });
    }
    const condiciones = ['u.identificacion = ?'];
    const params = [identificacion];
    if (rol) { condiciones.push('r.nombre_rol = ?'); params.push(rol); }

    const [rows] = await db.query(
      `SELECT u.id_usuario, u.nombres, u.apellidos, u.identificacion, u.correo, u.ficha, u.programa_formacion, u.estado, r.nombre_rol AS rol
       FROM usuarios u JOIN roles r ON u.id_rol = r.id_rol WHERE ${condiciones.join(' AND ')}`,
      params
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'No se encontró un usuario con esa identificación' });
    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

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

// DELETE /api/v1/usuarios/:id — desactivación lógica (RN-007)
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

// PUT /api/v1/usuarios/:id/activar  (NUEVO)
// Reactiva a un usuario previamente desactivado.
const activar = async (req, res) => {
  try {
    const [result] = await db.query(`UPDATE usuarios SET estado = 1 WHERE id_usuario = ?`, [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    await registrarCambio('usuarios', req.params.id, 'ACTIVAR', req.user?.id);
    return res.json({ success: true, message: 'Usuario activado' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

// DELETE /api/v1/usuarios/:id/permanente  (NUEVO)
// Eliminación física. Se bloquea si el usuario tiene registros
// dependientes (proyectos como instructor, tareas asignadas, membresías
// de equipo) para no romper la integridad referencial ni el historial —
// en ese caso, la vía correcta sigue siendo desactivar.
const eliminarPermanente = async (req, res) => {
  try {
    const id = req.params.id;
    const [[usuario]] = await db.query('SELECT id_usuario, estado FROM usuarios WHERE id_usuario = ?', [id]);
    if (!usuario) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });

    const [[{ total: proyectos }]] = await db.query('SELECT COUNT(*) AS total FROM proyectos WHERE id_instructor = ?', [id]);
    const [[{ total: tareas }]] = await db.query('SELECT COUNT(*) AS total FROM tareas WHERE id_asignado = ?', [id]);
    const [[{ total: equipos }]] = await db.query('SELECT COUNT(*) AS total FROM equipos_proyecto WHERE id_usuario = ?', [id]);

    if (proyectos > 0 || tareas > 0 || equipos > 0) {
      return res.status(409).json({
        success: false,
        message: `No se puede eliminar de forma permanente: tiene ${proyectos} proyecto(s), ${tareas} tarea(s) y ${equipos} membresía(s) de equipo asociadas. Desactívalo en su lugar.`,
      });
    }

    await db.query('DELETE FROM usuarios WHERE id_usuario = ?', [id]);
    await registrarCambio('usuarios', id, 'DELETE_PERMANENTE', req.user?.id);
    return res.json({ success: true, message: 'Usuario eliminado permanentemente' });
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

module.exports = { getAll, getById, buscarPorIdentificacion, update, remove, activar, eliminarPermanente, changePassword };
