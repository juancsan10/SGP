const db = require('../config/db');
const notificacionesService = require('./notificaciones.service');

async function runExpirationAlerts() {
  const [tasks] = await db.query(
    `SELECT t.id_tarea, t.titulo, t.fecha_vencimiento, t.id_asignado, p.nombre AS proyecto
     FROM tareas t
     JOIN proyectos p ON p.id_proyecto = t.id_proyecto
     WHERE t.fecha_vencimiento BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 2 DAY)
       AND t.estado NOT IN ('Completada', 'Cancelada')`
  );

  for (const t of tasks) {
    const [exists] = await db.query(
      `SELECT id_notificacion FROM notificaciones
       WHERE id_usuario = ? AND tipo = 'vencimiento' AND titulo = ? AND DATE(fecha_envio) = CURDATE()`,
      [t.id_asignado, `Vencimiento próximo: ${t.titulo}`]
    );
    if (!exists.length) {
      await notificacionesService.crearYNotificar({
        titulo: `Vencimiento próximo: ${t.titulo}`,
        mensaje: `La tarea del proyecto ${t.proyecto} vence el ${t.fecha_vencimiento}.`,
        tipo: 'vencimiento',
        prioridad: 'Alta',
        id_usuario: t.id_asignado
      });
    }
  }

  const [deliverables] = await db.query(
    `SELECT e.id_entregable, e.nombre, e.fecha_entrega, ep.id_proyecto, p.nombre AS proyecto, ep.id_usuario
     FROM entregables e
     JOIN fases_proyecto f ON f.id_fase = e.id_fase
     JOIN proyectos p ON p.id_proyecto = f.id_proyecto
     JOIN equipos_proyecto ep ON ep.id_proyecto = p.id_proyecto
     WHERE e.fecha_entrega BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 2 DAY)
       AND e.estado NOT IN ('Entregado', 'Aprobado')`
  );

  for (const e of deliverables) {
    const [exists] = await db.query(
      `SELECT id_notificacion FROM notificaciones
       WHERE id_usuario = ? AND tipo = 'vencimiento' AND titulo = ? AND DATE(fecha_envio) = CURDATE()`,
      [e.id_usuario, `Entregable próximo: ${e.nombre}`]
    );
    if (!exists.length) {
      await notificacionesService.crearYNotificar({
        titulo: `Entregable próximo: ${e.nombre}`,
        mensaje: `El entregable del proyecto ${e.proyecto} vence el ${e.fecha_entrega}.`,
        tipo: 'vencimiento',
        prioridad: 'Alta',
        id_usuario: e.id_usuario
      });
    }
  }
}

module.exports = { runExpirationAlerts };
