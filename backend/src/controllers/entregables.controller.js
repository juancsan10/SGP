const db = require('../config/db');
const { registrarCambio } = require('../services/historial.service');

// POST /api/v1/entregables
const create = async (req, res) => {
  try {
    const { nombre, descripcion, fecha_entrega, url_drive, version, id_fase } = req.body;

    if (!nombre || !fecha_entrega || !id_fase) {
      return res.status(400).json({ success: false, message: 'nombre, fecha_entrega e id_fase son requeridos' });
    }

    // NUEVO: no se permite crear un entregable con fecha límite ya pasada.
    const hoy = new Date(); hoy.setHours(0,0,0,0);
    const fechaEntregaDate = new Date(fecha_entrega); fechaEntregaDate.setHours(0,0,0,0);
    if (isNaN(fechaEntregaDate.getTime())) {
      return res.status(400).json({ success: false, message: 'fecha_entrega no es una fecha válida' });
    }
    if (fechaEntregaDate < hoy) {
      return res.status(400).json({ success: false, message: 'La fecha de entrega no puede ser una fecha pasada. Elige hoy o una fecha posterior.' });
    }

    const [fase] = await db.query('SELECT id_fase, id_proyecto, fecha_inicio, fecha_fin FROM fases_proyecto WHERE id_fase=?', [id_fase]);
    if (!fase.length) return res.status(404).json({ success: false, message: 'Fase no encontrada' });

    const [proyecto] = await db.query('SELECT estado FROM proyectos WHERE id_proyecto=?', [fase[0].id_proyecto]);
    if (!proyecto.length) return res.status(404).json({ success: false, message: 'Proyecto no encontrado' });
    if (['Finalizado', 'Cancelado'].includes(proyecto[0].estado)) {
      return res.status(400).json({ success: false, message: 'No se pueden crear entregables en un proyecto finalizado o cancelado' });
    }

    // NUEVO: coherencia de fechas padre-hijo — el entregable debe quedar
    // DENTRO del rango de fechas de su fase.
    if (fase[0].fecha_inicio && new Date(fecha_entrega) < new Date(fase[0].fecha_inicio)) {
      return res.status(400).json({ success: false, message: `La fecha de entrega no puede ser anterior al inicio de la fase (${new Date(fase[0].fecha_inicio).toISOString().slice(0,10)})` });
    }
    if (fase[0].fecha_fin && new Date(fecha_entrega) > new Date(fase[0].fecha_fin)) {
      return res.status(400).json({ success: false, message: `La fecha de entrega no puede ser posterior al fin de la fase (${new Date(fase[0].fecha_fin).toISOString().slice(0,10)})` });
    }

    const [result] = await db.query(
      `INSERT INTO entregables (nombre, descripcion, fecha_entrega, url_drive, version, estado, id_fase) VALUES (?, ?, ?, ?, ?, 'Pendiente', ?)`,
      [nombre, descripcion || null, fecha_entrega, url_drive || null, version || '1.0', id_fase]
    );

    await registrarCambio('entregables', result.insertId, 'INSERT', req.user?.id);
    return res.status(201).json({ success: true, message: 'Entregable creado', data: { id_entregable: result.insertId } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/v1/entregables/:id_fase
const getByFase = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT * FROM entregables WHERE id_fase = ? ORDER BY fecha_entrega ASC`,
      [req.params.id_fase]
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/v1/entregables/:id
const update = async (req, res) => {
  try {
    const { nombre, descripcion, fecha_entrega, fecha_entregado, estado, url_drive, version } = req.body;

    if (fecha_entrega && fecha_entregado && new Date(fecha_entregado) < new Date(fecha_entrega)) {
      return res.status(400).json({ success: false, message: 'La fecha de entrega real no puede ser anterior a la fecha programada' });
    }

    // NUEVO: coherencia con la fase padre si se está cambiando fecha_entrega
    // (no se exige que sea futura aquí a propósito: un instructor puede
    // necesitar corregir una fecha ya pasada por error de captura).
    if (fecha_entrega) {
      const [entregableActual] = await db.query(
        `SELECT f.fecha_inicio AS fase_inicio, f.fecha_fin AS fase_fin
         FROM entregables e JOIN fases_proyecto f ON f.id_fase = e.id_fase WHERE e.id_entregable = ?`,
        [req.params.id]
      );
      if (entregableActual.length) {
        const { fase_inicio, fase_fin } = entregableActual[0];
        if (fase_inicio && new Date(fecha_entrega) < new Date(fase_inicio)) {
          return res.status(400).json({ success: false, message: `La fecha de entrega no puede ser anterior al inicio de la fase (${new Date(fase_inicio).toISOString().slice(0,10)})` });
        }
        if (fase_fin && new Date(fecha_entrega) > new Date(fase_fin)) {
          return res.status(400).json({ success: false, message: `La fecha de entrega no puede ser posterior al fin de la fase (${new Date(fase_fin).toISOString().slice(0,10)})` });
        }
      }
    }

    const [result] = await db.query(
      `UPDATE entregables SET nombre = COALESCE(?, nombre), descripcion = COALESCE(?, descripcion),
       fecha_entrega = COALESCE(?, fecha_entrega), fecha_entregado = COALESCE(?, fecha_entregado),
       estado = COALESCE(?, estado), url_drive = COALESCE(?, url_drive), version = COALESCE(?, version)
       WHERE id_entregable = ?`,
      [nombre, descripcion, fecha_entrega, fecha_entregado, estado, url_drive, version, req.params.id]
    );

    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Entregable no encontrado' });
    await registrarCambio('entregables', req.params.id, 'UPDATE', req.user?.id);
    return res.json({ success: true, message: 'Entregable actualizado' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/v1/entregables/:id
const remove = async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM entregables WHERE id_entregable = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Entregable no encontrado' });
    await registrarCambio('entregables', req.params.id, 'DELETE', req.user?.id);
    return res.json({ success: true, message: 'Entregable eliminado' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { create, getByFase, update, remove };
