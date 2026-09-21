const db = require('../config/db');
const { registrarCambio } = require('../services/historial.service');

// POST /api/v1/equipos
const create = async (req, res) => {
  try {
    const { id_proyecto, id_usuario, rol_en_equipo } = req.body;

    if (!id_proyecto || !id_usuario) {
      return res.status(400).json({ success: false, message: 'id_proyecto e id_usuario son requeridos' });
    }

    const [proyecto] = await db.query('SELECT id_proyecto, estado FROM proyectos WHERE id_proyecto = ?', [id_proyecto]);
    if (!proyecto.length) return res.status(404).json({ success: false, message: 'Proyecto no encontrado' });
    if (['Finalizado', 'Cancelado'].includes(proyecto[0].estado)) {
      return res.status(400).json({ success: false, message: 'No se pueden modificar equipos de un proyecto finalizado o cancelado' });
    }

    const [usuario] = await db.query('SELECT id_usuario, id_rol, estado FROM usuarios WHERE id_usuario = ?', [id_usuario]);
    if (!usuario.length || !usuario[0].estado) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado o inactivo' });
    }
    if (Number(usuario[0].id_rol) !== 3) {
      return res.status(400).json({ success: false, message: 'Solo se pueden asignar aprendices a un proyecto' });
    }

    const [duplicado] = await db.query(
      'SELECT id_equipo FROM equipos_proyecto WHERE id_proyecto=? AND id_usuario=?',
      [id_proyecto, id_usuario]
    );
    if (duplicado.length) {
      return res.status(409).json({ success: false, message: 'El usuario ya pertenece a este proyecto' });
    }

    // RN-001: aprendiz max 2 proyectos activos
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
      `SELECT ep.*, CONCAT(u.nombres, ' ', u.apellidos) AS nombre_usuario, u.correo, u.identificacion, r.nombre_rol AS rol
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
// CORREGIDO: un Instructor ya no elimina directamente a un aprendiz del
// equipo — se crea una "solicitud de eliminación" que un Administrador
// debe aprobar o rechazar (ver solicitudes.controller más abajo). El
// Administrador sí puede eliminar directo (es quien resuelve solicitudes,
// tiene la autoridad final).
const remove = async (req, res) => {
  try {
    const [equipo] = await db.query('SELECT id_equipo, id_proyecto, id_usuario FROM equipos_proyecto WHERE id_equipo = ?', [req.params.id]);
    if (!equipo.length) return res.status(404).json({ success: false, message: 'Registro no encontrado' });

    if (req.user?.rol === 'Instructor') {
      const { motivo } = req.body;
      const [existente] = await db.query(
        `SELECT id_solicitud FROM solicitudes_equipo WHERE id_equipo = ? AND estado = 'Pendiente'`,
        [req.params.id]
      );
      if (existente.length) {
        return res.status(409).json({ success: false, message: 'Ya existe una solicitud pendiente para este miembro del equipo' });
      }
      const [result] = await db.query(
        `INSERT INTO solicitudes_equipo (id_equipo, id_proyecto, id_usuario_afectado, motivo, id_instructor_solicita)
         VALUES (?, ?, ?, ?, ?)`,
        [req.params.id, equipo[0].id_proyecto, equipo[0].id_usuario, motivo || null, req.user.id]
      );
      await registrarCambio('solicitudes_equipo', result.insertId, 'INSERT', req.user.id);
      return res.status(202).json({
        success: true,
        message: 'Se creó una solicitud de eliminación. Un administrador debe aprobarla.',
        data: { id_solicitud: result.insertId },
      });
    }

    // Administrador: elimina directamente.
    await db.query('DELETE FROM equipos_proyecto WHERE id_equipo = ?', [req.params.id]);
    await registrarCambio('equipos_proyecto', req.params.id, 'DELETE', req.user?.id);
    return res.json({ success: true, message: 'Miembro removido del equipo' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── Solicitudes de eliminación (NUEVO) ─────────────────────

// GET /api/v1/equipos/solicitudes  (Administrador)
const listSolicitudes = async (req, res) => {
  try {
    const estado = req.query.estado || 'Pendiente';
    const [rows] = await db.query(
      `SELECT s.*, p.nombre AS nombre_proyecto,
              CONCAT(ua.nombres,' ',ua.apellidos) AS nombre_afectado, ua.identificacion AS identificacion_afectado,
              CONCAT(ui.nombres,' ',ui.apellidos) AS nombre_instructor
       FROM solicitudes_equipo s
       JOIN proyectos p ON p.id_proyecto = s.id_proyecto
       JOIN usuarios ua ON ua.id_usuario = s.id_usuario_afectado
       JOIN usuarios ui ON ui.id_usuario = s.id_instructor_solicita
       WHERE s.estado = ?
       ORDER BY s.fecha_solicitud DESC`,
      [estado]
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/v1/equipos/solicitudes/:id/resolver  (Administrador)
// body: { aprobar: true|false, observacion_admin }
const resolverSolicitud = async (req, res) => {
  try {
    const { aprobar, observacion_admin } = req.body;
    if (typeof aprobar !== 'boolean') {
      return res.status(400).json({ success: false, message: 'aprobar debe ser true o false' });
    }
    const [sol] = await db.query(`SELECT * FROM solicitudes_equipo WHERE id_solicitud = ? AND estado = 'Pendiente'`, [req.params.id]);
    if (!sol.length) return res.status(404).json({ success: false, message: 'Solicitud no encontrada o ya resuelta' });

    const nuevoEstado = aprobar ? 'Aprobada' : 'Rechazada';
    await db.query(
      `UPDATE solicitudes_equipo SET estado = ?, id_admin_resuelve = ?, observacion_admin = ?, fecha_resolucion = NOW() WHERE id_solicitud = ?`,
      [nuevoEstado, req.user.id, observacion_admin || null, req.params.id]
    );

    if (aprobar) {
      await db.query('DELETE FROM equipos_proyecto WHERE id_equipo = ?', [sol[0].id_equipo]);
    }

    // Notifica al instructor que solicitó, con el resultado.
    await db.query(
      `INSERT INTO notificaciones (titulo, mensaje, tipo, prioridad, id_usuario) VALUES (?, ?, 'sistema', 'Media', ?)`,
      [`Solicitud de eliminación ${nuevoEstado.toLowerCase()}`,
       `Tu solicitud para remover a un aprendiz del equipo fue ${nuevoEstado.toLowerCase()} por el administrador.${observacion_admin ? ' Observación: ' + observacion_admin : ''}`,
       sol[0].id_instructor_solicita]
    );

    await registrarCambio('solicitudes_equipo', req.params.id, nuevoEstado.toUpperCase(), req.user.id);
    return res.json({ success: true, message: `Solicitud ${nuevoEstado.toLowerCase()}` });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { create, getByProyecto, remove, listSolicitudes, resolverSolicitud };
