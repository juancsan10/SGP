const db = require('../config/db');

// GET /api/v1/historial/:tabla
const getByTabla = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT h.*, COALESCE(CONCAT(u.nombres, ' ', u.apellidos), h.usuario_eliminado) AS usuario_nombre
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
// NUEVO: filtros completos (tabla, acción, usuario, rango de fechas,
// búsqueda de texto) + paginación real — antes solo traía los últimos 200
// registros sin forma de acotar la búsqueda.
const getAll = async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
    const offset = Math.max(Number(req.query.offset) || 0, 0);
    const { tabla, accion, id_usuario, fecha_desde, fecha_hasta, q } = req.query;

    const condiciones = [];
    const params = [];
    if (tabla) { condiciones.push('h.tabla_afectada = ?'); params.push(tabla); }
    if (accion) { condiciones.push('h.accion LIKE ?'); params.push(`%${accion}%`); }
    if (id_usuario) { condiciones.push('h.id_usuario = ?'); params.push(id_usuario); }
    if (fecha_desde) { condiciones.push('h.fecha_cambio >= ?'); params.push(fecha_desde); }
    if (fecha_hasta) { condiciones.push('h.fecha_cambio <= ?'); params.push(fecha_hasta); }
    if (q) {
      condiciones.push('(h.tabla_afectada LIKE ? OR h.accion LIKE ? OR CONCAT(u.nombres," ",u.apellidos) LIKE ?)');
      const like = `%${q}%`;
      params.push(like, like, like);
    }
    const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';

    const [rows] = await db.query(
      `SELECT h.*, COALESCE(CONCAT(u.nombres, ' ', u.apellidos), h.usuario_eliminado) AS usuario_nombre
       FROM historial_cambios h
       LEFT JOIN usuarios u ON h.id_usuario = u.id_usuario
       ${where}
       ORDER BY h.fecha_cambio DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM historial_cambios h LEFT JOIN usuarios u ON h.id_usuario = u.id_usuario ${where}`,
      params
    );
    return res.json({ success: true, data: rows, meta: { total, limit, offset } });
  } catch (err) {
    console.error(err); return res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

// GET /api/v1/historial/estadisticas/dashboard  (NUEVO — solo Administrador)
// Panel consolidado: totales del sistema + desglose de actividad reciente.
const estadisticas = async (req, res) => {
  try {
    const [[totales]] = await db.query(`
      SELECT
        (SELECT COUNT(*) FROM usuarios) AS total_usuarios,
        (SELECT COUNT(*) FROM usuarios WHERE estado = 1) AS usuarios_activos,
        (SELECT COUNT(*) FROM usuarios WHERE estado = 0) AS usuarios_inactivos,
        (SELECT COUNT(*) FROM usuarios u JOIN roles r ON r.id_rol=u.id_rol WHERE r.nombre_rol='Aprendiz') AS total_aprendices,
        (SELECT COUNT(*) FROM usuarios u JOIN roles r ON r.id_rol=u.id_rol WHERE r.nombre_rol='Instructor') AS total_instructores,
        (SELECT COUNT(*) FROM proyectos) AS total_proyectos,
        (SELECT COUNT(*) FROM proyectos WHERE estado='Activo') AS proyectos_activos,
        (SELECT COUNT(*) FROM proyectos WHERE estado='Finalizado') AS proyectos_finalizados,
        (SELECT COUNT(*) FROM tareas) AS total_tareas,
        (SELECT COUNT(*) FROM tareas WHERE estado='Completada') AS tareas_completadas,
        (SELECT COUNT(*) FROM entregas_tareas WHERE estado='Aprobada') AS entregas_aprobadas,
        (SELECT COUNT(*) FROM entregas_tareas WHERE estado='Requiere corrección') AS entregas_con_correccion,
        (SELECT COUNT(*) FROM solicitudes_equipo WHERE estado='Pendiente') AS solicitudes_pendientes,
        (SELECT COUNT(*) FROM repositorios WHERE estado_semaforo != 'verde') AS repositorios_con_alerta,
        (SELECT COUNT(*) FROM historial_cambios) AS total_cambios_registrados
    `);

    const [porTabla] = await db.query(`
      SELECT tabla_afectada, COUNT(*) AS total FROM historial_cambios
      GROUP BY tabla_afectada ORDER BY total DESC LIMIT 10
    `);

    const [porAccion] = await db.query(`
      SELECT accion, COUNT(*) AS total FROM historial_cambios
      GROUP BY accion ORDER BY total DESC LIMIT 10
    `);

    const [actividadReciente] = await db.query(`
      SELECT DATE(fecha_cambio) AS fecha, COUNT(*) AS total FROM historial_cambios
      WHERE fecha_cambio >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY DATE(fecha_cambio) ORDER BY fecha ASC
    `);

    const [usuariosMasActivos] = await db.query(`
      SELECT CONCAT(u.nombres,' ',u.apellidos) AS usuario, r.nombre_rol AS rol, COUNT(*) AS total_acciones
      FROM historial_cambios h JOIN usuarios u ON u.id_usuario = h.id_usuario JOIN roles r ON r.id_rol = u.id_rol
      GROUP BY h.id_usuario ORDER BY total_acciones DESC LIMIT 10
    `);

    return res.json({
      success: true,
      data: { totales, porTabla, porAccion, actividadReciente, usuariosMasActivos },
    });
  } catch (err) {
    console.error(err); return res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

// GET /api/v1/historial/eliminaciones  (NUEVO — Administrador)
// Registro de usuarios eliminados con el cuestionario que se diligenció.
const getEliminaciones = async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 100);
    const offset = Math.max(Number(req.query.offset) || 0, 0);
    const q = (req.query.q || '').trim();
    const where = q ? 'WHERE (e.nombre_completo LIKE ? OR e.correo LIKE ? OR e.identificacion LIKE ? OR e.motivo LIKE ?)' : '';
    const params = q ? Array(4).fill(`%${q}%`) : [];
    const [rows] = await db.query(
      `SELECT e.*, COALESCE(CONCAT(a.nombres,' ',a.apellidos), 'Administrador') AS admin_nombre,
              (SELECT COUNT(*) FROM eliminaciones_archivos x WHERE x.id_eliminacion = e.id_eliminacion) AS total_archivos
       FROM eliminaciones_usuario e LEFT JOIN usuarios a ON a.id_usuario = e.id_admin
       ${where} ORDER BY e.fecha_eliminacion DESC LIMIT ? OFFSET ?`, [...params, limit, offset]);
    const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM eliminaciones_usuario e ${where}`, params);
    return res.json({ success: true, data: rows, meta: { total, limit, offset } });
  } catch (err) {
    console.error(err); return res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

// GET /api/v1/historial/eliminaciones/:id  (NUEVO — Administrador)
const getEliminacion = async (req, res) => {
  try {
    const [[e]] = await db.query(
      `SELECT e.*, COALESCE(CONCAT(a.nombres,' ',a.apellidos), 'Administrador') AS admin_nombre
       FROM eliminaciones_usuario e LEFT JOIN usuarios a ON a.id_usuario = e.id_admin
       WHERE e.id_eliminacion = ?`, [req.params.id]);
    if (!e) return res.status(404).json({ success: false, message: 'Registro de eliminación no encontrado' });
    const [archivos] = await db.query(
      'SELECT * FROM eliminaciones_archivos WHERE id_eliminacion = ? ORDER BY id_archivo', [req.params.id]);
    let resumen = null;
    try { resumen = e.resumen ? JSON.parse(e.resumen) : null; } catch { resumen = null; }
    return res.json({ success: true, data: { ...e, resumen, archivos } });
  } catch (err) {
    console.error(err); return res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

module.exports = { getByTabla, getAll, estadisticas, getEliminaciones, getEliminacion };
