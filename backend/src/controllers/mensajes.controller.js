const db = require('../config/db');
const { registrarCambio } = require('../services/historial.service');
const { contienePalabraProhibida } = require('../utils/glosario-prohibido');
const notificacionesService = require('../services/notificaciones.service');

// ── Mensajes enriquecidos (NUEVO, punto 6 #19) ──────────
// tipo 'texto' (por defecto), 'encuesta' (pregunta + 2 a 6 opciones) o
// 'aviso' (solo el Instructor responsable; queda fijado arriba del chat).
// Además: responder a un mensaje (id_respuesta_a) y agregar la firma del
// usuario (incluir_firma), que se copia en el mensaje al enviarlo.
const TIPOS_MENSAJE = ['texto', 'encuesta', 'aviso'];
const MAX_CONTENIDO = 5000;

function limpiarOpciones(opciones) {
  if (!Array.isArray(opciones)) return null;
  const limpias = opciones.map(o => (typeof o === 'string' ? o.trim() : '')).filter(Boolean);
  if (limpias.length < 2 || limpias.length > 6) return null;
  if (limpias.some(o => o.length > 150)) return null;
  if (new Set(limpias.map(o => o.toLowerCase())).size !== limpias.length) return null;
  return limpias;
}

const esInstructorResponsable = async (idProyecto, user) => {
  if (user.rol !== 'Instructor') return false;
  const [rows] = await db.query('SELECT id_proyecto FROM proyectos WHERE id_proyecto = ? AND id_instructor = ?', [idProyecto, user.id]);
  return rows.length > 0;
};

// POST /api/v1/mensajes
const create = async (req, res) => {
  try {
    const { id_proyecto } = req.body;
    const contenido = typeof req.body.contenido === 'string' ? req.body.contenido.trim() : '';
    const tipo = req.body.tipo === undefined ? 'texto' : req.body.tipo;
    const id_remitente = req.user.id;

    if (!contenido || !id_proyecto) {
      return res.status(400).json({ success: false, message: 'contenido e id_proyecto son requeridos' });
    }
    if (contenido.length > MAX_CONTENIDO) {
      return res.status(400).json({ success: false, message: `El mensaje no puede superar los ${MAX_CONTENIDO} caracteres` });
    }
    if (!TIPOS_MENSAJE.includes(tipo)) {
      return res.status(400).json({ success: false, message: 'Tipo de mensaje inválido' });
    }
    let opciones = null;
    if (tipo === 'encuesta') {
      opciones = limpiarOpciones(req.body.opciones);
      if (!opciones) return res.status(400).json({ success: false, message: 'La encuesta necesita entre 2 y 6 opciones distintas (máximo 150 caracteres cada una)' });
    }
    if (tipo === 'aviso' && !(await esInstructorResponsable(id_proyecto, req.user))) {
      return res.status(403).json({ success: false, message: 'Solo el instructor responsable del proyecto puede publicar avisos' });
    }
    let idRespuesta = null;
    if (req.body.id_respuesta_a) {
      const [orig] = await db.query('SELECT id_mensaje FROM mensajes WHERE id_mensaje = ? AND id_proyecto = ?', [req.body.id_respuesta_a, id_proyecto]);
      if (!orig.length) return res.status(400).json({ success: false, message: 'El mensaje al que respondes no está en este proyecto' });
      idRespuesta = orig[0].id_mensaje;
    }

    // NUEVO: filtro de lenguaje inapropiado (Sección Mensajes, punto 6).
    // El administrador solo observa los mensajes; este filtro es lo que
    // efectivamente hace cumplir la regla — si el remitente usa una
    // palabra del glosario, el mensaje se rechaza y se le genera una
    // alerta (notificación) a quien cometió la infracción.
    const palabraDetectada = contienePalabraProhibida([contenido, ...(opciones || [])].join(' \n '));
    if (palabraDetectada) {
      await notificacionesService.crearYNotificar({
        titulo: 'Mensaje bloqueado por lenguaje inapropiado',
        mensaje: 'Tu mensaje no se envió porque contenía lenguaje no permitido en la plataforma. Recuerda mantener un trato respetuoso con tu equipo.',
        tipo: 'advertencia',
        prioridad: 'Alta',
        id_usuario: id_remitente
      });
      await registrarCambio('mensajes', null, 'BLOQUEADO_LENGUAJE_INAPROPIADO', id_remitente);
      return res.status(400).json({ success: false, message: 'Tu mensaje contiene lenguaje no permitido y no fue enviado. Se generó una alerta en tu cuenta.' });
    }

    let firma = null;
    if (req.body.incluir_firma) {
      const [[u]] = await db.query('SELECT firma FROM usuarios WHERE id_usuario = ?', [id_remitente]);
      firma = u?.firma || null;
    }

    const [result] = await db.query(
      `INSERT INTO mensajes (contenido, id_remitente, id_proyecto, tipo, id_respuesta_a, firma, fijado) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [contenido, id_remitente, id_proyecto, tipo, idRespuesta, firma, tipo === 'aviso' ? 1 : 0]
    );
    if (opciones) {
      await db.query('INSERT INTO encuesta_opciones (id_mensaje, texto, orden) VALUES ?',
        [opciones.map((texto, i) => [result.insertId, texto, i + 1])]);
    }

    // NUEVO: se registra en el historial/trazabilidad — antes un mensaje
    // enviado con éxito no dejaba ningún rastro en historial_cambios,
    // solo los que se bloqueaban por lenguaje inapropiado.
    await registrarCambio('mensajes', result.insertId, 'INSERT', id_remitente);

    // Notificar a los miembros del proyecto (RN-021)
    const [miembros] = await db.query(
      `SELECT DISTINCT id_usuario FROM equipos_proyecto WHERE id_proyecto = ? AND id_usuario != ?`,
      [id_proyecto, id_remitente]
    );

    // El mensaje ya quedó guardado: si el aviso falla se registra, pero no se responde 500
    // (la persona lo reenviaría y quedaría duplicado en el chat del proyecto).
    const TITULOS = { texto: 'Nuevo mensaje', encuesta: 'Nueva encuesta en el proyecto', aviso: 'Nuevo aviso del instructor' };
    try {
      await notificacionesService.crearYNotificarMultiples({
        ids_usuarios: miembros.map(m => m.id_usuario),
        titulo: TITULOS[tipo],
        mensaje: contenido.substring(0, 100),
        tipo: 'mensaje',
        prioridad: tipo === 'aviso' ? 'Alta' : 'Media',
        id_creador: id_remitente
      });
    } catch (avisoErr) {
      console.error('[notificaciones] No se pudo avisar el nuevo mensaje:', avisoErr.message);
    }

    return res.status(201).json({ success: true, message: 'Mensaje enviado', data: { id_mensaje: result.insertId } });
  } catch (err) {
    console.error(err); return res.status(500).json({ success: false, message: 'Error interno del servidor' });
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
      await notificacionesService.crearYNotificar({
        titulo: 'Edición de mensaje bloqueada por lenguaje inapropiado',
        mensaje: 'La edición de tu mensaje no se guardó porque contenía lenguaje no permitido en la plataforma.',
        tipo: 'advertencia',
        prioridad: 'Alta',
        id_usuario: req.user.id
      });
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
    console.error(err); return res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

// Resultados de las encuestas de un proyecto: { id_mensaje: { opciones, total_votos, mi_opcion } }
async function encuestasDelProyecto(idProyecto, idUsuario) {
  const [opciones] = await db.query(
    `SELECT o.id_opcion, o.id_mensaje, o.texto, o.orden, COUNT(v.id_voto) AS votos,
            MAX(CASE WHEN v.id_usuario = ? THEN 1 ELSE 0 END) AS mia
     FROM encuesta_opciones o
     JOIN mensajes m ON m.id_mensaje = o.id_mensaje
     LEFT JOIN encuesta_votos v ON v.id_opcion = o.id_opcion
     WHERE m.id_proyecto = ?
     GROUP BY o.id_opcion, o.id_mensaje, o.texto, o.orden
     ORDER BY o.id_mensaje, o.orden`,
    [idUsuario, idProyecto]
  );
  const porMensaje = {};
  for (const o of opciones) {
    const e = (porMensaje[o.id_mensaje] ||= { opciones: [], total_votos: 0, mi_opcion: null });
    e.opciones.push({ id_opcion: o.id_opcion, texto: o.texto, votos: Number(o.votos) });
    e.total_votos += Number(o.votos);
    if (Number(o.mia)) e.mi_opcion = o.id_opcion;
  }
  return porMensaje;
}

// GET /api/v1/mensajes/:id_proyecto
// NUEVO (punto 6): incluye la cita del mensaje respondido, el rol del
// remitente y los resultados de las encuestas.
const getByProyecto = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT m.*, COALESCE(CONCAT(u.nombres, ' ', u.apellidos), 'Usuario eliminado') AS remitente_nombre,
              ru.nombre_rol AS remitente_rol,
              r.contenido AS respuesta_contenido,
              COALESCE(CONCAT(ur.nombres, ' ', ur.apellidos), 'Usuario eliminado') AS respuesta_remitente
       FROM mensajes m
       LEFT JOIN usuarios u ON m.id_remitente = u.id_usuario
       LEFT JOIN roles ru ON ru.id_rol = u.id_rol
       LEFT JOIN mensajes r ON r.id_mensaje = m.id_respuesta_a
       LEFT JOIN usuarios ur ON ur.id_usuario = r.id_remitente
       WHERE m.id_proyecto = ? ORDER BY m.fecha_envio ASC`,
      [req.params.id_proyecto]
    );
    const encuestas = rows.some(m => m.tipo === 'encuesta') ? await encuestasDelProyecto(req.params.id_proyecto, req.user.id) : {};
    const data = rows.map(m => (m.tipo === 'encuesta'
      ? { ...m, encuesta: encuestas[m.id_mensaje] || { opciones: [], total_votos: 0, mi_opcion: null } }
      : m));
    return res.json({ success: true, data });
  } catch (err) {
    console.error(err); return res.status(500).json({ success: false, message: 'Error interno del servidor' });
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
    console.error(err); return res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

// POST /api/v1/mensajes/:id/votar  (NUEVO, punto 6) — { id_opcion }
// Un voto por persona; volver a votar cambia la opción elegida.
const votar = async (req, res) => {
  try {
    const [[m]] = await db.query('SELECT id_mensaje, id_proyecto, tipo FROM mensajes WHERE id_mensaje = ?', [req.params.id]);
    if (!m) return res.status(404).json({ success: false, message: 'Mensaje no encontrado' });
    if (m.tipo !== 'encuesta') return res.status(400).json({ success: false, message: 'Este mensaje no es una encuesta' });
    const [op] = await db.query('SELECT id_opcion FROM encuesta_opciones WHERE id_opcion = ? AND id_mensaje = ?', [req.body.id_opcion, m.id_mensaje]);
    if (!op.length) return res.status(400).json({ success: false, message: 'Esa opción no pertenece a la encuesta' });

    await db.query(
      `INSERT INTO encuesta_votos (id_mensaje, id_opcion, id_usuario) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE id_opcion = VALUES(id_opcion), fecha_voto = NOW()`,
      [m.id_mensaje, op[0].id_opcion, req.user.id]);
    const encuestas = await encuestasDelProyecto(m.id_proyecto, req.user.id);
    return res.json({ success: true, message: 'Voto registrado', data: encuestas[m.id_mensaje] });
  } catch (err) {
    console.error(err); return res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

// PUT /api/v1/mensajes/:id/fijar  (NUEVO, punto 6) — { fijado } solo el instructor responsable
const fijar = async (req, res) => {
  try {
    const [[m]] = await db.query('SELECT id_mensaje, id_proyecto FROM mensajes WHERE id_mensaje = ?', [req.params.id]);
    if (!m) return res.status(404).json({ success: false, message: 'Mensaje no encontrado' });
    if (!(await esInstructorResponsable(m.id_proyecto, req.user))) {
      return res.status(403).json({ success: false, message: 'Solo el instructor responsable puede fijar mensajes' });
    }
    const fijado = req.body.fijado ? 1 : 0;
    await db.query('UPDATE mensajes SET fijado = ? WHERE id_mensaje = ?', [fijado, m.id_mensaje]);
    await registrarCambio('mensajes', m.id_mensaje, fijado ? 'FIJAR' : 'DESFIJAR', req.user.id);
    return res.json({ success: true, message: fijado ? 'Mensaje fijado' : 'Mensaje desfijado' });
  } catch (err) {
    console.error(err); return res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

// GET / PUT /api/v1/mensajes/firma/mia  (NUEVO, punto 6) — firma personal
const getFirma = async (req, res) => {
  try {
    const [[u]] = await db.query('SELECT firma FROM usuarios WHERE id_usuario = ?', [req.user.id]);
    return res.json({ success: true, data: { firma: u?.firma || '' } });
  } catch (err) {
    console.error(err); return res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};
const setFirma = async (req, res) => {
  try {
    const firma = typeof req.body.firma === 'string' ? req.body.firma.trim() : '';
    if (firma.length > 150) return res.status(400).json({ success: false, message: 'La firma no puede superar los 150 caracteres' });
    if (firma && contienePalabraProhibida(firma)) return res.status(400).json({ success: false, message: 'La firma contiene lenguaje no permitido' });
    await db.query('UPDATE usuarios SET firma = ? WHERE id_usuario = ?', [firma || null, req.user.id]);
    return res.json({ success: true, message: firma ? 'Firma guardada' : 'Firma eliminada', data: { firma } });
  } catch (err) {
    console.error(err); return res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

module.exports = { create, update, getByProyecto, getRecientes, votar, fijar, getFirma, setFirma };
