const db = require('../config/db');
const { registrarCambio } = require('../services/historial.service');
const { contienePalabraProhibida } = require('../utils/glosario-prohibido');

// POST /api/v1/mensajes
const create = async (req, res) => {
  try {
    const { contenido, id_proyecto } = req.body;
    const id_remitente = req.user.id;

    if (!contenido || !id_proyecto) {
      return res.status(400).json({ success: false, message: 'contenido e id_proyecto son requeridos' });
    }

    // NUEVO: filtro de lenguaje inapropiado (Sección Mensajes, punto 6).
    // El administrador solo observa los mensajes; este filtro es lo que
    // efectivamente hace cumplir la regla — si el remitente usa una
    // palabra del glosario, el mensaje se rechaza y se le genera una
    // alerta (notificación) a quien cometió la infracción.
    const palabraDetectada = contienePalabraProhibida(contenido);
    if (palabraDetectada) {
      await db.query(
        `INSERT INTO notificaciones (titulo, mensaje, tipo, prioridad, id_usuario) VALUES (?, ?, 'advertencia', 'Alta', ?)`,
        ['Mensaje bloqueado por lenguaje inapropiado',
         'Tu mensaje no se envió porque contenía lenguaje no permitido en la plataforma. Recuerda mantener un trato respetuoso con tu equipo.',
         id_remitente]
      );
      await registrarCambio('mensajes', null, 'BLOQUEADO_LENGUAJE_INAPROPIADO', id_remitente);
      return res.status(400).json({ success: false, message: 'Tu mensaje contiene lenguaje no permitido y no fue enviado. Se generó una alerta en tu cuenta.' });
    }

    const [result] = await db.query(
      `INSERT INTO mensajes (contenido, id_remitente, id_proyecto) VALUES (?, ?, ?)`,
      [contenido, id_remitente, id_proyecto]
    );

    // NUEVO: se registra en el historial/trazabilidad — antes un mensaje
    // enviado con éxito no dejaba ningún rastro en historial_cambios,
    // solo los que se bloqueaban por lenguaje inapropiado.
    await registrarCambio('mensajes', result.insertId, 'INSERT', id_remitente);

    // Notificar a los miembros del proyecto (RN-021)
    const [miembros] = await db.query(
      `SELECT DISTINCT id_usuario FROM equipos_proyecto WHERE id_proyecto = ? AND id_usuario != ?`,
      [id_proyecto, id_remitente]
    );

    const notifPromises = miembros.map(m =>
      db.query(
        `INSERT INTO notificaciones (titulo, mensaje, tipo, id_usuario) VALUES ('Nuevo mensaje', ?, 'mensaje', ?)`,
        [contenido.substring(0, 100), m.id_usuario]
      )
    );
    await Promise.all(notifPromises);

    return res.status(201).json({ success: true, message: 'Mensaje enviado', data: { id_mensaje: result.insertId } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/v1/mensajes/:id  (NUEVO)
// Solo el remitente original puede editar su propio mensaje — ni el
// administrador ni otros miembros del equipo pueden editar mensajes ajenos.
const update = async (req, res) => {
  try {
    const { contenido } = req.body;
    if (!contenido || !contenido.trim()) {
      return res.status(400).json({ success: false, message: 'El contenido es requerido' });
    }

    const [rows] = await db.query('SELECT id_remitente FROM mensajes WHERE id_mensaje = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Mensaje no encontrado' });
    if (Number(rows[0].id_remitente) !== Number(req.user.id)) {
      return res.status(403).json({ success: false, message: 'Solo puedes editar tus propios mensajes' });
    }

    // El filtro de lenguaje inapropiado también aplica al editar — no se
    // puede burlar el glosario cambiando el contenido después de enviado.
    const palabraDetectada = contienePalabraProhibida(contenido);
    if (palabraDetectada) {
      await db.query(
        `INSERT INTO notificaciones (titulo, mensaje, tipo, prioridad, id_usuario) VALUES (?, ?, 'advertencia', 'Alta', ?)`,
        ['Edición de mensaje bloqueada por lenguaje inapropiado',
         'La edición de tu mensaje no se guardó porque contenía lenguaje no permitido en la plataforma.',
         req.user.id]
      );
      await registrarCambio('mensajes', req.params.id, 'BLOQUEADO_LENGUAJE_INAPROPIADO', req.user.id);
      return res.status(400).json({ success: false, message: 'La edición contiene lenguaje no permitido y no fue guardada. Se generó una alerta en tu cuenta.' });
    }

    await db.query(
      `UPDATE mensajes SET contenido = ?, fecha_edicion = NOW() WHERE id_mensaje = ?`,
      [contenido, req.params.id]
    );
    await registrarCambio('mensajes', req.params.id, 'UPDATE', req.user.id);
    return res.json({ success: true, message: 'Mensaje actualizado' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/v1/mensajes/:id_proyecto
const getByProyecto = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT m.*, COALESCE(CONCAT(u.nombres, ' ', u.apellidos), 'Usuario eliminado') AS remitente_nombre
       FROM mensajes m LEFT JOIN usuarios u ON m.id_remitente = u.id_usuario
       WHERE m.id_proyecto = ? ORDER BY m.fecha_envio ASC`,
      [req.params.id_proyecto]
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/v1/mensajes/recientes/dashboard  (NUEVO)
// CORREGIDO: el Dashboard antes armaba esta lista pidiendo "los primeros 5
// proyectos" y luego los mensajes de esos 5 — así que un mensaje creado en
// cualquier proyecto que no estuviera entre esos 5 (por ejemplo, uno más
// antiguo, ya que /proyectos ordena por fecha_creacion DESC) se guardaba
// bien en la base de datos pero el Dashboard nunca llegaba a pedirlo. Este
// endpoint consulta la tabla de mensajes directamente, ya ordenada y
// acotada por el propio backend, sin depender de qué proyectos "ganaron"
// el recorte del lado del cliente.
const getRecientes = async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 8, 1), 50);
    const condiciones = [];
    const params = [];

    if (req.user.rol === 'Instructor') {
      condiciones.push('p.id_instructor = ?');
      params.push(req.user.id);
    } else if (req.user.rol === 'Aprendiz') {
      condiciones.push('m.id_proyecto IN (SELECT id_proyecto FROM equipos_proyecto WHERE id_usuario = ?)');
      params.push(req.user.id);
    }
    // Administrador: sin condición — ve mensajes de todos los proyectos.
    const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';

    const [rows] = await db.query(
      `SELECT m.*, COALESCE(CONCAT(u.nombres,' ',u.apellidos), 'Usuario eliminado') AS remitente_nombre, p.nombre AS proyecto_nombre
       FROM mensajes m
       LEFT JOIN usuarios u ON u.id_usuario = m.id_remitente
       JOIN proyectos p ON p.id_proyecto = m.id_proyecto
       ${where}
       ORDER BY m.fecha_envio DESC
       LIMIT ?`,
      [...params, limit]
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { create, update, getByProyecto, getRecientes };
