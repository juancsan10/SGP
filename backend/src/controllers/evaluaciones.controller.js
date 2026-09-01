const db = require('../config/db');
const { registrarCambio } = require('../services/historial.service');

// POST /api/v1/evaluaciones
// RN-016: Solo se puede evaluar un entregable cuyo proyecto esté en estado
// "En Revisión".
const create = async (req, res) => {
  try {
    const { calificacion, comentarios, id_entregable } = req.body;
    const id_usuario = req.user.id;

    if (calificacion === undefined || !id_entregable) {
      return res.status(400).json({ success: false, message: 'calificacion e id_entregable son requeridos' });
    }
    if (calificacion < 0 || calificacion > 100) {
      return res.status(400).json({ success: false, message: 'RN-013: La calificación debe estar entre 0 y 100' });
    }

    // RN-016: verificar que el proyecto del entregable esté "En Revisión"
    const [proyectoRows] = await db.query(
      `SELECT p.estado FROM entregables e
       JOIN fases_proyecto f ON e.id_fase = f.id_fase
       JOIN proyectos p ON f.id_proyecto = p.id_proyecto
       WHERE e.id_entregable = ?`,
      [id_entregable]
    );
    if (proyectoRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Entregable no encontrado' });
    }
    if (proyectoRows[0].estado !== 'En Revisión') {
      return res.status(400).json({
        success: false,
        message: 'RN-016: Solo se pueden evaluar entregables de proyectos en estado "En Revisión"',
      });
    }

    const [result] = await db.query(
      `INSERT INTO evaluaciones (calificacion, comentarios, id_entregable, id_usuario) VALUES (?, ?, ?, ?)`,
      [calificacion, comentarios || null, id_entregable, id_usuario]
    );

    await registrarCambio('evaluaciones', result.insertId, 'INSERT', id_usuario);
    return res.status(201).json({ success: true, message: 'Evaluación registrada', data: { id_evaluacion: result.insertId } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/v1/evaluaciones/:id_entregable
const getByEntregable = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT ev.*, CONCAT(u.nombres, ' ', u.apellidos) AS evaluador_nombre
       FROM evaluaciones ev
       JOIN usuarios u ON ev.id_usuario = u.id_usuario
       WHERE ev.id_entregable = ? ORDER BY ev.fecha_evaluacion DESC`,
      [req.params.id_entregable]
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/v1/evaluaciones/:id
const update = async (req, res) => {
  try {
    const { calificacion, comentarios } = req.body;
    if (calificacion !== undefined && (calificacion < 0 || calificacion > 100)) {
      return res.status(400).json({ success: false, message: 'RN-013: La calificación debe estar entre 0 y 100' });
    }

    const [result] = await db.query(
      `UPDATE evaluaciones SET calificacion = COALESCE(?, calificacion), comentarios = COALESCE(?, comentarios)
       WHERE id_evaluacion = ?`,
      [calificacion, comentarios, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Evaluación no encontrada' });
    await registrarCambio('evaluaciones', req.params.id, 'UPDATE', req.user?.id);
    return res.json({ success: true, message: 'Evaluación actualizada' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { create, getByEntregable, update };
