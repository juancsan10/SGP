const db = require('../config/db');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const { registrarCambio } = require('../services/historial.service');
const { UPLOAD_DIR } = require('../middlewares/upload.middleware');

const CORREO_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const CC_RE = /^[0-9]{5,15}$/;

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

// El Administrador es único: no se puede desactivar ni eliminar, porque el
// sistema quedaría sin nadie que lo supervise. Devuelve true si el usuario
// indicado es Administrador.
const esAdministrador = async (id) => {
  const [[fila]] = await db.query(
    `SELECT r.nombre_rol FROM usuarios u JOIN roles r ON u.id_rol = r.id_rol WHERE u.id_usuario = ?`,
    [id]
  );
  return fila?.nombre_rol === 'Administrador';
};

const update = async (req, res) => {
  try {
    const { nombres, apellidos, ficha, programa_formacion } = req.body;
    const { id } = req.params;

    // NUEVO: el Administrador también puede corregir la identificación (cc)
    // y el correo. Un usuario editando su propio perfil no puede cambiarlos.
    let { correo, identificacion } = req.body;
    const cambiaCorreo = correo !== undefined && correo !== null && String(correo).trim() !== '';
    const cambiaCc = identificacion !== undefined && identificacion !== null && String(identificacion).trim() !== '';
    if ((cambiaCorreo || cambiaCc) && req.user?.rol !== 'Administrador') {
      return res.status(403).json({ success: false, message: 'Solo el Administrador puede modificar el correo o la identificación' });
    }
    if (cambiaCorreo) {
      correo = String(correo).trim().toLowerCase();
      if (!CORREO_RE.test(correo) || correo.length > 150) {
        return res.status(400).json({ success: false, message: 'Correo electrónico inválido' });
      }
      const [dup] = await db.query('SELECT id_usuario FROM usuarios WHERE correo = ? AND id_usuario <> ?', [correo, id]);
      if (dup.length) return res.status(409).json({ success: false, message: 'Ese correo ya está registrado por otro usuario' });
    }
    if (cambiaCc) {
      identificacion = String(identificacion).trim();
      if (!CC_RE.test(identificacion)) {
        return res.status(400).json({ success: false, message: 'La identificación debe tener entre 5 y 15 dígitos' });
      }
      const [dup] = await db.query('SELECT id_usuario FROM usuarios WHERE identificacion = ? AND id_usuario <> ?', [identificacion, id]);
      if (dup.length) return res.status(409).json({ success: false, message: 'Esa identificación ya está registrada por otro usuario' });
    }

    const query = `UPDATE usuarios SET nombres = COALESCE(?, nombres), apellidos = COALESCE(?, apellidos), ficha = COALESCE(?, ficha), programa_formacion = COALESCE(?, programa_formacion),
                   correo = COALESCE(?, correo), identificacion = COALESCE(?, identificacion) WHERE id_usuario = ?`;
    const params = [nombres ?? null, apellidos ?? null, ficha ?? null, programa_formacion ?? null,
                    cambiaCorreo ? correo : null, cambiaCc ? identificacion : null, id];

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
    if (await esAdministrador(req.params.id)) {
      return res.status(403).json({ success: false, message: 'No se puede desactivar al Administrador único del sistema' });
    }
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

// ── Eliminación definitiva con cuestionario (NUEVO) ─────────────
// El Administrador puede eliminar a cualquier usuario (salvo a sí mismo:
// es el Administrador único), pero antes debe diligenciar un cuestionario
// con el motivo, una descripción y, opcionalmente, archivos que justifiquen
// la decisión. Todo queda guardado en historial (eliminaciones_usuario).
//
// Qué pasa con la información del usuario:
//   · Tareas asignadas (y sus entregas) y membresías de equipo → se eliminan.
//   · Proyectos que dirige (Instructor) → se reasignan al instructor que
//     el Administrador elija en el cuestionario (no se pierde el proyecto).
//   · Mensajes, comentarios y evaluaciones → se conservan como
//     "Usuario eliminado" para no romper las conversaciones ni las notas.
//   · Notificaciones recibidas, solicitudes, tokens → se eliminan.
//   · Historial de cambios → se conserva con su nombre y cc de respaldo.
const MOTIVOS_ELIMINACION = [
  'Retiro voluntario del programa',
  'Finalización de la formación',
  'Deserción o inasistencia',
  'Incumplimiento del reglamento',
  'Cuenta duplicada o creada por error',
  'Solicitud del propio usuario',
  'Otro',
];

async function contarImpacto(conn, id) {
  const q = async (sql) => (await conn.query(sql, [id]))[0][0].total;
  return {
    proyectos:      await q('SELECT COUNT(*) AS total FROM proyectos WHERE id_instructor = ?'),
    tareas:         await q('SELECT COUNT(*) AS total FROM tareas WHERE id_asignado = ?'),
    entregas:       await q('SELECT COUNT(*) AS total FROM entregas_tareas WHERE id_aprendiz = ?'),
    equipos:        await q('SELECT COUNT(*) AS total FROM equipos_proyecto WHERE id_usuario = ?'),
    mensajes:       await q('SELECT COUNT(*) AS total FROM mensajes WHERE id_remitente = ?'),
    comentarios:    await q('SELECT COUNT(*) AS total FROM comentarios WHERE id_usuario = ?'),
    evaluaciones:   await q('SELECT COUNT(*) AS total FROM evaluaciones WHERE id_usuario = ?'),
    notificaciones: await q('SELECT COUNT(*) AS total FROM notificaciones WHERE id_usuario = ?'),
    solicitudes:    await q('SELECT COUNT(*) AS total FROM solicitudes WHERE id_solicitante = ?'),
  };
}

// GET /api/v1/usuarios/:id/impacto-eliminacion
// Lo que se verá afectado, para mostrarlo en el cuestionario antes de confirmar.
const impactoEliminacion = async (req, res) => {
  try {
    const [[u]] = await db.query(
      `SELECT u.id_usuario, u.nombres, u.apellidos, u.correo, u.identificacion, r.nombre_rol AS rol
       FROM usuarios u JOIN roles r ON r.id_rol = u.id_rol WHERE u.id_usuario = ?`, [req.params.id]);
    if (!u) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    const impacto = await contarImpacto(db, u.id_usuario);
    let instructoresDisponibles = [];
    if (impacto.proyectos > 0) {
      [instructoresDisponibles] = await db.query(
        `SELECT u.id_usuario, CONCAT(u.nombres,' ',u.apellidos) AS nombre, u.identificacion
         FROM usuarios u JOIN roles r ON r.id_rol = u.id_rol
         WHERE r.nombre_rol = 'Instructor' AND u.estado = 1 AND u.id_usuario <> ? ORDER BY u.nombres`, [u.id_usuario]);
    }
    return res.json({ success: true, data: { usuario: u, impacto, motivos: MOTIVOS_ELIMINACION, instructoresDisponibles } });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

function borrarArchivosSubidos(req) {
  (req.files || []).forEach(f => { try { fs.unlinkSync(f.path); } catch { /* ya no existe */ } });
}

// POST /api/v1/usuarios/:id/eliminacion   (multipart/form-data)
// Campos: motivo, descripcion, id_instructor_reemplazo (si aplica),
//         archivos[] (hasta 5; PDF, JPG, PNG o WEBP; 10 MB c/u)
const eliminarConJustificacion = async (req, res) => {
  const id = Number(req.params.id);
  const motivo = String(req.body.motivo || '').trim();
  const descripcion = String(req.body.descripcion || '').trim();
  const idReemplazo = req.body.id_instructor_reemplazo ? Number(req.body.id_instructor_reemplazo) : null;

  if (!MOTIVOS_ELIMINACION.includes(motivo)) {
    borrarArchivosSubidos(req);
    return res.status(400).json({ success: false, message: 'Selecciona un motivo de eliminación válido' });
  }
  if (descripcion.length < 20) {
    borrarArchivosSubidos(req);
    return res.status(400).json({ success: false, message: 'Describe el motivo con al menos 20 caracteres' });
  }

  const conn = await db.getConnection();
  try {
    const [[u]] = await conn.query(
      `SELECT u.*, r.nombre_rol AS rol FROM usuarios u JOIN roles r ON r.id_rol = u.id_rol WHERE u.id_usuario = ?`, [id]);
    if (!u) { borrarArchivosSubidos(req); return res.status(404).json({ success: false, message: 'Usuario no encontrado' }); }
    if (u.rol === 'Administrador') {
      borrarArchivosSubidos(req);
      return res.status(403).json({ success: false, message: 'No se puede eliminar al Administrador único del sistema' });
    }

    const impacto = await contarImpacto(conn, id);
    if (impacto.proyectos > 0) {
      if (!idReemplazo) {
        borrarArchivosSubidos(req);
        return res.status(400).json({ success: false, message: `Este instructor dirige ${impacto.proyectos} proyecto(s): elige a qué instructor se reasignan` });
      }
      const [[rep]] = await conn.query(
        `SELECT u.id_usuario FROM usuarios u JOIN roles r ON r.id_rol = u.id_rol
         WHERE u.id_usuario = ? AND r.nombre_rol = 'Instructor' AND u.estado = 1 AND u.id_usuario <> ?`, [idReemplazo, id]);
      if (!rep) {
        borrarArchivosSubidos(req);
        return res.status(400).json({ success: false, message: 'El instructor de reemplazo no es válido o está inactivo' });
      }
    }

    await conn.beginTransaction();
    const nombreCompleto = `${u.nombres} ${u.apellidos}`;
    const respaldo = `${nombreCompleto}${u.identificacion ? ` (cc ${u.identificacion})` : ''} — eliminado`;

    if (impacto.proyectos > 0) {
      await conn.query('UPDATE proyectos SET id_instructor = ? WHERE id_instructor = ?', [idReemplazo, id]);
    }
    // Solicitudes de baja de equipo donde participa (como afectado o solicitante).
    await conn.query('DELETE FROM solicitudes_equipo WHERE id_usuario_afectado = ? OR id_instructor_solicita = ?', [id, id]);
    await conn.query('UPDATE solicitudes_equipo SET id_admin_resuelve = NULL WHERE id_admin_resuelve = ?', [id]);
    // Tareas asignadas y sus entregas.
    await conn.query('DELETE et FROM entregas_tareas et JOIN tareas t ON t.id_tarea = et.id_tarea WHERE t.id_asignado = ?', [id]);
    await conn.query('DELETE FROM entregas_tareas WHERE id_aprendiz = ?', [id]);
    await conn.query('DELETE FROM tareas WHERE id_asignado = ?', [id]);
    await conn.query('DELETE FROM equipos_proyecto WHERE id_usuario = ?', [id]);
    // Autoría que se conserva como "Usuario eliminado".
    await conn.query('UPDATE mensajes SET id_remitente = NULL WHERE id_remitente = ?', [id]);
    await conn.query('UPDATE comentarios SET id_usuario = NULL WHERE id_usuario = ?', [id]);
    await conn.query('UPDATE evaluaciones SET id_usuario = NULL WHERE id_usuario = ?', [id]);
    await conn.query('UPDATE notificaciones SET id_creador = NULL WHERE id_creador = ?', [id]);
    await conn.query('UPDATE historial_cambios SET usuario_eliminado = ?, id_usuario = NULL WHERE id_usuario = ?', [respaldo, id]);
    // Datos propios del usuario.
    await conn.query('DELETE FROM notificaciones WHERE id_usuario = ?', [id]);
    await conn.query('DELETE FROM solicitudes WHERE id_solicitante = ?', [id]);
    await conn.query('UPDATE solicitudes SET id_admin_resuelve = NULL WHERE id_admin_resuelve = ?', [id]);
    await conn.query('DELETE FROM password_reset_tokens WHERE id_usuario = ?', [id]);
    await conn.query('DELETE FROM github_integration WHERE id_usuario = ?', [id]);
    await conn.query('DELETE FROM usuarios WHERE id_usuario = ?', [id]);

    const resumen = { ...impacto, proyectos_reasignados_a: impacto.proyectos > 0 ? idReemplazo : null };
    const [ins] = await conn.query(
      `INSERT INTO eliminaciones_usuario
        (id_usuario_eliminado, nombre_completo, correo, identificacion, rol, motivo, descripcion, resumen, id_admin)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, nombreCompleto, u.correo, u.identificacion || null, u.rol, motivo, descripcion, JSON.stringify(resumen), req.user.id]);
    for (const f of (req.files || [])) {
      await conn.query(
        `INSERT INTO eliminaciones_archivos (id_eliminacion, nombre_original, ruta_archivo, tipo_mime, tamano_bytes)
         VALUES (?, ?, ?, ?, ?)`,
        [ins.insertId, f.originalname.slice(0, 255), `/uploads/${f.filename}`, f.mimetype, f.size]);
    }
    await conn.query(
      `INSERT INTO historial_cambios (tabla_afectada, id_registro, accion, id_usuario, usuario_eliminado) VALUES ('usuarios', ?, 'DELETE_PERMANENTE', ?, NULL)`,
      [id, req.user.id]);
    await conn.commit();

    return res.json({
      success: true,
      message: `${nombreCompleto} fue eliminado. La justificación quedó registrada en el historial.`,
      data: { id_eliminacion: ins.insertId, resumen },
    });
  } catch (err) {
    try { await conn.rollback(); } catch { /* sin transacción activa */ }
    borrarArchivosSubidos(req);
    console.error(err);
    return res.status(500).json({ success: false, message: 'No se pudo eliminar el usuario' });
  } finally {
    conn.release();
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

module.exports = { getAll, getById, buscarPorIdentificacion, update, remove, activar, impactoEliminacion, eliminarConJustificacion, changePassword };
