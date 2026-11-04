// =====================================================
// services/notificaciones.service.js
// Servicio unificado para creación y despacho en tiempo real
// =====================================================
const db = require('../config/db');
const realtimeService = require('./realtime.service');

const TIPOS_VALIDOS = ['mensaje', 'tarea', 'sistema', 'mantenimiento', 'advertencia', 'informativo', 'vencimiento'];
const PRIORIDADES_VALIDAS = ['Baja', 'Media', 'Alta'];

/**
 * Crea una notificación en la base de datos y la emite en tiempo real
 * al usuario destinatario vía WebSocket / SSE.
 */
async function crearYNotificar({
  titulo,
  mensaje,
  tipo = 'sistema',
  prioridad = 'Media',
  id_usuario,
  id_creador = null,
  fecha_envio = null
}) {
  if (!titulo || !mensaje || !id_usuario) {
    throw new Error('titulo, mensaje e id_usuario son obligatorios');
  }

  const tipoFinal = TIPOS_VALIDOS.includes(tipo) ? tipo : 'sistema';
  const prioridadFinal = PRIORIDADES_VALIDAS.includes(prioridad) ? prioridad : 'Media';
  const fechaFinal = fecha_envio ? new Date(fecha_envio) : new Date();

  const [res] = await db.query(
    `INSERT INTO notificaciones (titulo, mensaje, tipo, prioridad, id_usuario, id_creador, fecha_envio)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [titulo, mensaje, tipoFinal, prioridadFinal, id_usuario, id_creador, fechaFinal]
  );

  const notificacion = {
    id_notificacion: res.insertId,
    titulo,
    mensaje,
    tipo: tipoFinal,
    prioridad: prioridadFinal,
    leida: 0,
    fecha_envio: fechaFinal.toISOString(),
    id_usuario: Number(id_usuario),
    id_creador: id_creador ? Number(id_creador) : null
  };

  // Notificar en tiempo real al usuario destinatario
  realtimeService.enviarNotificacionAUsuario(id_usuario, notificacion);

  return notificacion;
}

/**
 * Crea la misma notificación para una lista de usuarios destinatarios
 * y la despacha en tiempo real a cada uno.
 */
async function crearYNotificarMultiples({
  ids_usuarios = [],
  titulo,
  mensaje,
  tipo = 'sistema',
  prioridad = 'Media',
  id_creador = null,
  fecha_envio = null
}) {
  if (!ids_usuarios || ids_usuarios.length === 0) return [];
  const fechaCompartida = fecha_envio ? new Date(fecha_envio) : new Date();

  const promesas = ids_usuarios.map(id =>
    crearYNotificar({
      titulo,
      mensaje,
      tipo,
      prioridad,
      id_usuario: id,
      id_creador,
      fecha_envio: fechaCompartida
    })
  );

  return Promise.all(promesas);
}

module.exports = {
  crearYNotificar,
  crearYNotificarMultiples
};
