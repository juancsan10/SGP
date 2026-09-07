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

    const [proyecto] = await db.query('SELECT id_proyecto, estado FROM proyectos WHERE id_proyecto=?', [id_proyecto]);
    if (!proyecto.length) return res.status(404).json({ success: false, message: 'Proyecto no encontrado' });
    if (['Finalizado', 'Cancelado'].includes(proyecto[0].estado)) {
      return res.status(400).json({ success: false, message: 'No se pueden crear tareas en un proyecto finalizado o cancelado' });
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

module.exports = { create, getByProyecto, update, remove };
