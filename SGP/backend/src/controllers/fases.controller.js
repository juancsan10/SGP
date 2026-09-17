const db = require('../config/db');
const { registrarCambio } = require('../services/historial.service');

// POST /api/v1/fases
const create = async (req, res) => {
  try {
    const { nombre_fase, descripcion, fecha_inicio, fecha_fin, id_proyecto } = req.body;

    if (!nombre_fase || !id_proyecto) {
      return res.status(400).json({ success: false, message: 'nombre_fase e id_proyecto son requeridos' });
    }
    if (fecha_inicio && fecha_fin && new Date(fecha_fin) <= new Date(fecha_inicio)) {
      return res.status(400).json({ success: false, message: 'La fecha de fin debe ser posterior a la fecha de inicio' });
    }

    const [proyecto] = await db.query('SELECT id_proyecto, estado, fecha_inicio, fecha_fin FROM proyectos WHERE id_proyecto=?', [id_proyecto]);
    if (!proyecto.length) return res.status(404).json({ success: false, message: 'Proyecto no encontrado' });
    if (['Finalizado', 'Cancelado'].includes(proyecto[0].estado)) {
      return res.status(400).json({ success: false, message: 'No se pueden agregar fases a un proyecto finalizado o cancelado' });
    }

    // NUEVO: coherencia de fechas padre-hijo — la fase debe quedar DENTRO
    // del rango de fechas del proyecto al que pertenece.
    const proyectoInicio = proyecto[0].fecha_inicio;
    const proyectoFin = proyecto[0].fecha_fin;
    if (fecha_inicio && proyectoInicio && new Date(fecha_inicio) < new Date(proyectoInicio)) {
      return res.status(400).json({ success: false, message: `La fecha de inicio de la fase no puede ser anterior al inicio del proyecto (${new Date(proyectoInicio).toISOString().slice(0,10)})` });
    }
    if (fecha_fin && proyectoFin && new Date(fecha_fin) > new Date(proyectoFin)) {
      return res.status(400).json({ success: false, message: `La fecha de fin de la fase no puede ser posterior al fin del proyecto (${new Date(proyectoFin).toISOString().slice(0,10)})` });
    }

    const [result] = await db.query(
      `INSERT INTO fases_proyecto (nombre_fase, descripcion, fecha_inicio, fecha_fin, id_proyecto) VALUES (?, ?, ?, ?, ?)`,
      [nombre_fase, descripcion || null, fecha_inicio || null, fecha_fin || null, id_proyecto]
    );

    await registrarCambio('fases_proyecto', result.insertId, 'INSERT', req.user?.id);
    return res.status(201).json({ success: true, message: 'Fase creada', data: { id_fase: result.insertId } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/v1/fases/:id_proyecto
const getByProyecto = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT * FROM fases_proyecto WHERE id_proyecto = ? ORDER BY fecha_inicio ASC`,
      [req.params.id_proyecto]
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/v1/fases/:id
const update = async (req, res) => {
  try {
    const { nombre_fase, descripcion, fecha_inicio, fecha_fin, porcentaje_avance } = req.body;

    if (fecha_inicio && fecha_fin && new Date(fecha_fin) <= new Date(fecha_inicio)) {
      return res.status(400).json({ success: false, message: 'La fecha de fin debe ser posterior a la fecha de inicio' });
    }

    // NUEVO: coherencia con el proyecto padre también al editar.
    if (fecha_inicio || fecha_fin) {
      const [faseActual] = await db.query(
        `SELECT f.fecha_inicio AS fase_inicio, f.fecha_fin AS fase_fin, p.fecha_inicio AS proyecto_inicio, p.fecha_fin AS proyecto_fin
         FROM fases_proyecto f JOIN proyectos p ON p.id_proyecto = f.id_proyecto WHERE f.id_fase = ?`,
        [req.params.id]
      );
      if (faseActual.length) {
        const { proyecto_inicio, proyecto_fin } = faseActual[0];
        const nuevoInicio = fecha_inicio || faseActual[0].fase_inicio;
        const nuevoFin = fecha_fin || faseActual[0].fase_fin;
        if (nuevoInicio && proyecto_inicio && new Date(nuevoInicio) < new Date(proyecto_inicio)) {
          return res.status(400).json({ success: false, message: `La fecha de inicio de la fase no puede ser anterior al inicio del proyecto (${new Date(proyecto_inicio).toISOString().slice(0,10)})` });
        }
        if (nuevoFin && proyecto_fin && new Date(nuevoFin) > new Date(proyecto_fin)) {
          return res.status(400).json({ success: false, message: `La fecha de fin de la fase no puede ser posterior al fin del proyecto (${new Date(proyecto_fin).toISOString().slice(0,10)})` });
        }
      }
    }

    // RN-013
    if (porcentaje_avance !== undefined && (porcentaje_avance < 0 || porcentaje_avance > 100)) {
      return res.status(400).json({ success: false, message: 'RN-013: El avance debe estar entre 0% y 100%' });
    }

    const [result] = await db.query(
      `UPDATE fases_proyecto SET nombre_fase = COALESCE(?, nombre_fase), descripcion = COALESCE(?, descripcion),
       fecha_inicio = COALESCE(?, fecha_inicio), fecha_fin = COALESCE(?, fecha_fin),
       porcentaje_avance = COALESCE(?, porcentaje_avance) WHERE id_fase = ?`,
      [nombre_fase, descripcion, fecha_inicio, fecha_fin, porcentaje_avance, req.params.id]
    );

    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Fase no encontrada' });
    await registrarCambio('fases_proyecto', req.params.id, 'UPDATE', req.user?.id);
    return res.json({ success: true, message: 'Fase actualizada' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/v1/fases/:id
const remove = async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM fases_proyecto WHERE id_fase = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Fase no encontrada' });
    await registrarCambio('fases_proyecto', req.params.id, 'DELETE', req.user?.id);
    return res.json({ success: true, message: 'Fase eliminada' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { create, getByProyecto, update, remove };
