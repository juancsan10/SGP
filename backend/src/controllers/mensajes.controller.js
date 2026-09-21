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

// GET /api/v1/mensajes/:id_proyecto
const getByProyecto = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT m.*, CONCAT(u.nombres, ' ', u.apellidos) AS remitente_nombre
       FROM mensajes m JOIN usuarios u ON m.id_remitente = u.id_usuario
       WHERE m.id_proyecto = ? ORDER BY m.fecha_envio ASC`,
      [req.params.id_proyecto]
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { create, getByProyecto };
