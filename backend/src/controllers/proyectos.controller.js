const db = require('../config/db');
const { registrarCambio } = require('../services/historial.service');

// POST /api/v1/proyectos
const create = async (req, res) => {
  try {
    const { nombre, descripcion, fecha_inicio, fecha_fin, id_instructor } = req.body;

    if (!nombre || !fecha_inicio || !id_instructor) {
      return res.status(400).json({ success: false, message: 'nombre, fecha_inicio e id_instructor son requeridos' });
    }

    // RN-011: fecha_fin > fecha_inicio
    if (fecha_fin && new Date(fecha_fin) <= new Date(fecha_inicio)) {
      return res.status(400).json({ success: false, message: 'RN-011: La fecha de fin debe ser posterior a la fecha de inicio' });
    }

    // RN-004: duración entre 1 y 6 meses
    if (fecha_fin) {
      const diffMonths = (new Date(fecha_fin) - new Date(fecha_inicio)) / (1000 * 60 * 60 * 24 * 30);
      if (diffMonths < 1 || diffMonths > 6) {
        return res.status(400).json({ success: false, message: 'RN-004: Los proyectos deben durar entre 1 y 6 meses' });
      }
    }

    // RN-002: instructor no puede tener más de 10 proyectos activos
    const [activos] = await db.query(
      `SELECT COUNT(*) AS total FROM proyectos WHERE id_instructor = ? AND estado NOT IN ('Finalizado','Cancelado')`,
      [id_instructor]
    );
    if (activos[0].total >= 10) {
      return res.status(400).json({ success: false, message: 'RN-002: El instructor ya supervisa 10 proyectos activos' });
    }

    // RN-009: estado inicial = "En Planificación"
    const [result] = await db.query(
      `INSERT INTO proyectos (nombre, descripcion, fecha_inicio, fecha_fin, estado, id_instructor) VALUES (?, ?, ?, ?, 'En Planificación', ?)`,
      [nombre, descripcion || null, fecha_inicio, fecha_fin || null, id_instructor]
    );

    await registrarCambio('proyectos', result.insertId, 'INSERT', req.user?.id);
    return res.status(201).json({ success: true, message: 'Proyecto creado', data: { id_proyecto: result.insertId } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/v1/proyectos
const getAll = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT p.*, CONCAT(u.nombres, ' ', u.apellidos) AS instructor
       FROM proyectos p JOIN usuarios u ON p.id_instructor = u.id_usuario
       ORDER BY p.fecha_creacion DESC`
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/v1/proyectos/:id
const getById = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT p.*, CONCAT(u.nombres, ' ', u.apellidos) AS instructor
       FROM proyectos p JOIN usuarios u ON p.id_instructor = u.id_usuario
       WHERE p.id_proyecto = ?`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Proyecto no encontrado' });

    // Obtener equipo
    const [equipo] = await db.query(
      `SELECT ep.*, CONCAT(u.nombres, ' ', u.apellidos) AS nombre_usuario, u.correo
       FROM equipos_proyecto ep JOIN usuarios u ON ep.id_usuario = u.id_usuario
       WHERE ep.id_proyecto = ?`,
      [req.params.id]
    );

    return res.json({ success: true, data: { ...rows[0], equipo } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/v1/proyectos/:id
const update = async (req, res) => {
  try {
    const { nombre, descripcion, fecha_inicio, fecha_fin, estado, porcentaje_avance } = req.body;
    const { id } = req.params;

    // RN-013: avance entre 0 y 100
    if (porcentaje_avance !== undefined && (porcentaje_avance < 0 || porcentaje_avance > 100)) {
      return res.status(400).json({ success: false, message: 'RN-013: El avance debe estar entre 0% y 100%' });
    }

    // RN-014: avance no puede disminuir
    if (porcentaje_avance !== undefined) {
      const [actual] = await db.query('SELECT porcentaje_avance FROM proyectos WHERE id_proyecto = ?', [id]);
      if (actual.length > 0 && porcentaje_avance < parseFloat(actual[0].porcentaje_avance)) {
        return res.status(400).json({ success: false, message: 'RN-014: El avance no puede disminuir' });
      }
    }

    const [result] = await db.query(
      `UPDATE proyectos SET nombre = COALESCE(?, nombre), descripcion = COALESCE(?, descripcion),
       fecha_inicio = COALESCE(?, fecha_inicio), fecha_fin = COALESCE(?, fecha_fin),
       estado = COALESCE(?, estado), porcentaje_avance = COALESCE(?, porcentaje_avance)
       WHERE id_proyecto = ?`,
      [nombre, descripcion, fecha_inicio, fecha_fin, estado, porcentaje_avance, id]
    );

    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Proyecto no encontrado' });
    await registrarCambio('proyectos', id, 'UPDATE', req.user?.id);
    return res.json({ success: true, message: 'Proyecto actualizado' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/v1/proyectos/:id — RN-012: eliminación lógica
const remove = async (req, res) => {
  try {
    const [result] = await db.query(
      `UPDATE proyectos SET estado = 'Cancelado' WHERE id_proyecto = ?`,
      [req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Proyecto no encontrado' });
    await registrarCambio('proyectos', req.params.id, 'DELETE', req.user?.id);
    return res.json({ success: true, message: 'Proyecto cancelado (eliminación lógica)' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { create, getAll, getById, update, remove };
