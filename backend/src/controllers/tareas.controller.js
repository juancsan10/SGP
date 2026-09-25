const db = require('../config/db');
const { registrarCambio } = require('../services/historial.service');

// POST /api/v1/tareas
const create = async (req, res) => {
  try {
    const { titulo, descripcion, fecha_inicio, fecha_vencimiento, prioridad, id_proyecto, id_asignado } = req.body;

    if (!titulo || !id_proyecto || !id_asignado) {
      return res.status(400).json({ success: false, message: 'titulo, id_proyecto e id_asignado son requeridos' });
    }
    if (fecha_inicio && fecha_vencimiento && new Date(fecha_vencimiento) < new Date(fecha_inicio)) {
      return res.status(400).json({ success: false, message: 'La fecha de vencimiento no puede ser anterior a la fecha de inicio' });
    }

    const [proyecto] = await db.query('SELECT id_proyecto, estado, fecha_inicio, fecha_fin FROM proyectos WHERE id_proyecto=?', [id_proyecto]);
    if (!proyecto.length) return res.status(404).json({ success: false, message: 'Proyecto no encontrado' });
    if (['Finalizado', 'Cancelado'].includes(proyecto[0].estado)) {
      return res.status(400).json({ success: false, message: 'No se pueden crear tareas en un proyecto finalizado o cancelado' });
    }

    // NUEVO: coherencia de fechas padre-hijo — la tarea debe quedar DENTRO
    // del rango de fechas del proyecto al que pertenece.
    const { fecha_inicio: proyectoInicio, fecha_fin: proyectoFin } = proyecto[0];
    if (fecha_inicio && proyectoInicio && new Date(fecha_inicio) < new Date(proyectoInicio)) {
      return res.status(400).json({ success: false, message: `La fecha de inicio de la tarea no puede ser anterior al inicio del proyecto (${new Date(proyectoInicio).toISOString().slice(0,10)})` });
    }
    if (fecha_vencimiento && proyectoFin && new Date(fecha_vencimiento) > new Date(proyectoFin)) {
      return res.status(400).json({ success: false, message: `La fecha de vencimiento de la tarea no puede ser posterior al fin del proyecto (${new Date(proyectoFin).toISOString().slice(0,10)})` });
    }

    const [asignado] = await db.query('SELECT id_usuario, estado FROM usuarios WHERE id_usuario=?', [id_asignado]);
    if (!asignado.length || !asignado[0].estado) return res.status(404).json({ success: false, message: 'Usuario asignado no encontrado o inactivo' });

    const [miembro] = await db.query('SELECT id_equipo FROM equipos_proyecto WHERE id_proyecto=? AND id_usuario=?', [id_proyecto, id_asignado]);
    if (!miembro.length) {
      return res.status(400).json({ success: false, message: 'El usuario asignado debe pertenecer al equipo del proyecto' });
    }

    // RN-017: toda tarea debe tener responsable (ya validado)
    const [result] = await db.query(
      `INSERT INTO tareas (titulo, descripcion, fecha_inicio, fecha_vencimiento, estado, prioridad, id_proyecto, id_asignado)
       VALUES (?, ?, ?, ?, 'Pendiente', ?, ?, ?)`,
      [titulo, descripcion || null, fecha_inicio || null, fecha_vencimiento || null, prioridad || 'Media', id_proyecto, id_asignado]
    );

    // Notificación automática al asignado (RN-021)
    await db.query(
      `INSERT INTO notificaciones (titulo, mensaje, tipo, id_usuario) VALUES (?, ?, 'tarea', ?)`,
      [`Nueva tarea asignada: ${titulo}`, `Se te ha asignado la tarea "${titulo}" en el proyecto.`, id_asignado]
    );

    await registrarCambio('tareas', result.insertId, 'INSERT', req.user?.id);
    return res.status(201).json({ success: true, message: 'Tarea creada', data: { id_tarea: result.insertId } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/v1/tareas  (NUEVO — listado global para Administrador/Instructor)
// Muestra la identificación (cc) tanto del aprendiz asignado como del
// instructor responsable del proyecto, con filtros de búsqueda.
const getAllAdmin = async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100);
    const offset = Math.max(Number(req.query.offset) || 0, 0);
    const { cc, proyecto, estado, prioridad } = req.query;

    const condiciones = [];
    const params = [];
    // Si es Instructor, solo ve las tareas de SUS proyectos (Admin ve todo).
    if (req.user.rol === 'Instructor') {
      condiciones.push('p.id_instructor = ?');
      params.push(req.user.id);
    }
    if (cc) {
      condiciones.push('(ua.identificacion LIKE ? OR ui.identificacion LIKE ?)');
      params.push(`%${cc}%`, `%${cc}%`);
    }
    if (proyecto) { condiciones.push('p.nombre LIKE ?'); params.push(`%${proyecto}%`); }
    if (estado) { condiciones.push('t.estado = ?'); params.push(estado); }
    if (prioridad) { condiciones.push('t.prioridad = ?'); params.push(prioridad); }
    const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';

    const [rows] = await db.query(
      `SELECT t.*, p.nombre AS nombre_proyecto,
              CONCAT(ua.nombres,' ',ua.apellidos) AS asignado_nombre, ua.identificacion AS cc_aprendiz,
              CONCAT(ui.nombres,' ',ui.apellidos) AS instructor_nombre, ui.identificacion AS cc_instructor,
              et.id_entrega, et.estado AS estado_entrega, et.calificacion,
              et.observacion_instructor, et.fecha_revision
       FROM tareas t
       JOIN proyectos p ON p.id_proyecto = t.id_proyecto
       LEFT JOIN entregas_tareas et ON et.id_tarea = t.id_tarea
       JOIN usuarios ua ON ua.id_usuario = t.id_asignado
       JOIN usuarios ui ON ui.id_usuario = p.id_instructor
       ${where}
       ORDER BY t.fecha_vencimiento ASC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM tareas t JOIN proyectos p ON p.id_proyecto=t.id_proyecto
       JOIN usuarios ua ON ua.id_usuario=t.id_asignado JOIN usuarios ui ON ui.id_usuario=p.id_instructor ${where}`,
      params
    );
    return res.json({ success: true, data: rows, meta: { total, limit, offset } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/v1/tareas/:id_proyecto
const getByProyecto = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT t.*, CONCAT(u.nombres, ' ', u.apellidos) AS asignado_nombre
       FROM tareas t JOIN usuarios u ON t.id_asignado = u.id_usuario
       WHERE t.id_proyecto = ? ORDER BY t.fecha_vencimiento ASC`,
      [req.params.id_proyecto]
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/v1/tareas/:id
const update = async (req, res) => {
  try {
    const { titulo, descripcion, fecha_inicio, fecha_vencimiento, estado, prioridad, porcentaje_avance } = req.body;

    if (fecha_inicio && fecha_vencimiento && new Date(fecha_vencimiento) < new Date(fecha_inicio)) {
      return res.status(400).json({ success: false, message: 'La fecha de vencimiento no puede ser anterior a la fecha de inicio' });
    }

    // NUEVO: coherencia con el proyecto padre también al editar.
    if (fecha_inicio || fecha_vencimiento) {
      const [tareaActual] = await db.query(
        `SELECT t.fecha_inicio AS tarea_inicio, t.fecha_vencimiento AS tarea_venc, p.fecha_inicio AS proyecto_inicio, p.fecha_fin AS proyecto_fin
         FROM tareas t JOIN proyectos p ON p.id_proyecto = t.id_proyecto WHERE t.id_tarea = ?`,
        [req.params.id]
      );
      if (tareaActual.length) {
        const { proyecto_inicio, proyecto_fin } = tareaActual[0];
        const nuevoInicio = fecha_inicio || tareaActual[0].tarea_inicio;
        const nuevoVenc = fecha_vencimiento || tareaActual[0].tarea_venc;
        if (nuevoInicio && proyecto_inicio && new Date(nuevoInicio) < new Date(proyecto_inicio)) {
          return res.status(400).json({ success: false, message: `La fecha de inicio de la tarea no puede ser anterior al inicio del proyecto (${new Date(proyecto_inicio).toISOString().slice(0,10)})` });
        }
        if (nuevoVenc && proyecto_fin && new Date(nuevoVenc) > new Date(proyecto_fin)) {
          return res.status(400).json({ success: false, message: `La fecha de vencimiento de la tarea no puede ser posterior al fin del proyecto (${new Date(proyecto_fin).toISOString().slice(0,10)})` });
        }
      }
    }

    // RN-013
    if (porcentaje_avance !== undefined && (porcentaje_avance < 0 || porcentaje_avance > 100)) {
      return res.status(400).json({ success: false, message: 'RN-013: El avance debe estar entre 0% y 100%' });
    }

    const [result] = await db.query(
      `UPDATE tareas SET titulo = COALESCE(?, titulo), descripcion = COALESCE(?, descripcion),
       fecha_inicio = COALESCE(?, fecha_inicio), fecha_vencimiento = COALESCE(?, fecha_vencimiento),
       estado = COALESCE(?, estado), prioridad = COALESCE(?, prioridad),
       porcentaje_avance = COALESCE(?, porcentaje_avance) WHERE id_tarea = ?`,
      [titulo, descripcion, fecha_inicio, fecha_vencimiento, estado, prioridad, porcentaje_avance, req.params.id]
    );

    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Tarea no encontrada' });
    await registrarCambio('tareas', req.params.id, 'UPDATE', req.user?.id);
    return res.json({ success: true, message: 'Tarea actualizada' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/v1/tareas/:id
const remove = async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM tareas WHERE id_tarea = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Tarea no encontrada' });
    await registrarCambio('tareas', req.params.id, 'DELETE', req.user?.id);
    return res.json({ success: true, message: 'Tarea eliminada' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/v1/tareas/recientes/dashboard  (NUEVO)
// CORREGIDO: mismo problema que se encontró en mensajes — el Dashboard
// armaba "Tareas recientes" pidiendo tareas de "los primeros 5 proyectos"
// (por fecha_creacion DESC), así que una tarea de cualquier proyecto fuera
// de ese top 5 quedaba guardada pero invisible en el panel. Disponible
// para cualquier rol, con el alcance resuelto en el propio backend.
const getRecientes = async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 8, 1), 50);
    const condiciones = [];
    const params = [];

    if (req.user.rol === 'Instructor') {
      condiciones.push('p.id_instructor = ?');
      params.push(req.user.id);
    } else if (req.user.rol === 'Aprendiz') {
      condiciones.push('t.id_asignado = ?');
      params.push(req.user.id);
    }
    // Administrador: sin condición — ve tareas de todos los proyectos.
    const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';

    const [rows] = await db.query(
      `SELECT t.*, p.nombre AS proyecto_nombre, CONCAT(u.nombres,' ',u.apellidos) AS asignado_nombre
       FROM tareas t
       JOIN proyectos p ON p.id_proyecto = t.id_proyecto
       JOIN usuarios u ON u.id_usuario = t.id_asignado
       ${where}
       ORDER BY t.id_tarea DESC
       LIMIT ?`,
      [...params, limit]
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { create, getByProyecto, getAllAdmin, getRecientes, update, remove };
