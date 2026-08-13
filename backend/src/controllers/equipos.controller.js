const db = require('../config/db');
const { registrarCambio } = require('../services/historial.service');

// POST /api/v1/equipos
const create = async (req, res) => {
  try {
    const { id_proyecto, id_usuario, rol_en_equipo } = req.body;

    if (!id_proyecto || !id_usuario) {
      return res.status(400).json({ success: false, message: 'id_proyecto e id_usuario son requeridos' });
    }

    // RN-001: aprendiz max 2 proyectos activos
    const [usuario] = await db.query('SELECT id_rol FROM usuarios WHERE id_usuario = ?', [id_usuario]);
    if (usuario.length > 0 && usuario[0].id_rol === 3) { // Aprendiz
      const [activos] = await db.query(
        `SELECT COUNT(*) AS total FROM equipos_proyecto ep
         JOIN proyectos p ON ep.id_proyecto = p.id_proyecto
         WHERE ep.id_usuario = ? AND p.estado NOT IN ('Finalizado','Cancelado')`,
        [id_usuario]
      );
      if (activos[0].total >= 2) {
        return res.status(400).json({ success: false, message: 'RN-001: El aprendiz ya tiene 2 proyectos activos' });
      }
    }

    const [result] = await db.query(
      `INSERT INTO equipos_proyecto (id_proyecto, id_usuario, rol_en_equipo) VALUES (?, ?, ?)`,
      [id_proyecto, id_usuario, rol_en_equipo || null]
    );

    await registrarCambio('equipos_proyecto', result.insertId, 'INSERT', req.user?.id);
    return res.status(201).json({ success: true, message: 'Miembro añadido al equipo', data: { id_equipo: result.insertId } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/v1/equipos/:id_proyecto
const getByProyecto = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT ep.*, CONCAT(u.nombres, ' ', u.apellidos) AS nombre_usuario, u.correo, r.nombre_rol AS rol
       FROM equipos_proyecto ep
       JOIN usuarios u ON ep.id_usuario = u.id_usuario
       JOIN roles r ON u.id_rol = r.id_rol
       WHERE ep.id_proyecto = ?`,
      [req.params.id_proyecto]
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/v1/equipos/:id
const remove = async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM equipos_proyecto WHERE id_equipo = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Registro no encontrado' });
    return res.json({ success: true, message: 'Miembro removido del equipo' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { create, getByProyecto, remove };
