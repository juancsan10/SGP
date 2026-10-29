const fs = require('fs');
const path = require('path');
const db = require('../config/db');
const { registrarCambio } = require('../services/historial.service');
const { UPLOAD_DIR } = require('../middlewares/upload.middleware');

async function getTask(taskId) {
  const [rows] = await db.query(`SELECT t.*, p.id_instructor, p.estado AS proyecto_estado FROM tareas t JOIN proyectos p ON p.id_proyecto=t.id_proyecto WHERE t.id_tarea=?`, [taskId]);
  return rows[0] || null;
}

// NUEVO: si la petición vino de /entregas/tarea/:id/upload, multer ya
// escribió el archivo en disco ANTES de que submit() decida si la entrega
// es válida (ej. "no está habilitada para corrección"). Sin esta función,
// esos rechazos dejaban un archivo huérfano en uploads/ que nunca se
// asociaba a ningún registro en la base de datos.
function borrarArchivoSiExiste(req) {
  if (req.file) {
    const rutaFisica = path.join(UPLOAD_DIR, req.file.filename);
    fs.unlink(rutaFisica, (err) => {
      if (err && err.code !== 'ENOENT') console.error('No se pudo borrar el archivo huérfano:', err.message);
    });
  }
}

const getByTarea = async (req,res) => {
  try {
    const task = await getTask(req.params.id);
    if (!task) return res.status(404).json({success:false,message:'Tarea no encontrada'});
    if (req.user.rol === 'Instructor') {
      if (Number(task.id_instructor) !== Number(req.user.id)) return res.status(403).json({success:false,message:'Solo el instructor responsable puede consultar esta entrega'});
    } else if (req.user.rol === 'Aprendiz' && Number(task.id_asignado) !== Number(req.user.id)) {
      return res.status(403).json({success:false,message:'Solo puedes consultar la entrega de tu tarea asignada'});
    }
    const [rows] = await db.query(`SELECT e.*, CONCAT(u.nombres,' ',u.apellidos) AS aprendiz_nombre, u.identificacion FROM entregas_tareas e JOIN usuarios u ON u.id_usuario=e.id_aprendiz WHERE e.id_tarea=?`,[req.params.id]);
    return res.json({success:true,data:rows[0] || null});
  } catch(err){ return res.status(500).json({success:false,message:'Error interno del servidor'}); }
};

const submit = async (req,res) => {
  try {
    const task = await getTask(req.params.id);
    if (!task) { borrarArchivoSiExiste(req); return res.status(404).json({success:false,message:'Tarea no encontrada'}); }
    if (['Finalizado','Cancelado'].includes(task.proyecto_estado)) { borrarArchivoSiExiste(req); return res.status(400).json({success:false,message:'El proyecto no permite nuevas entregas'}); }
    const { comentario_aprendiz, url_entrega, ruta_archivo } = req.body;
    if (!comentario_aprendiz && !url_entrega && !ruta_archivo) { borrarArchivoSiExiste(req); return res.status(400).json({success:false,message:'Debes aportar comentario, enlace o archivo'}); }
    const [existing] = await db.query('SELECT * FROM entregas_tareas WHERE id_tarea=?',[req.params.id]);
    if (existing.length) {
      if (req.user.rol !== 'Administrador' && existing[0].id_aprendiz !== Number(req.user.id)) { borrarArchivoSiExiste(req); return res.status(403).json({success:false,message:'La entrega pertenece a otro aprendiz'}); }
      if (req.user.rol !== 'Administrador' && existing[0].estado !== 'Requiere corrección') { borrarArchivoSiExiste(req); return res.status(400).json({success:false,message:'La entrega no está habilitada para corrección'}); }
      await db.query(`UPDATE entregas_tareas SET comentario_aprendiz=?,url_entrega=?,ruta_archivo=?,estado='Corregida',fecha_entrega=NOW(),fecha_revision=NULL,observacion_instructor=NULL WHERE id_tarea=?`,[comentario_aprendiz||null,url_entrega||null,ruta_archivo||null,req.params.id]);
      await registrarCambio('entregas_tareas',existing[0].id_entrega,'UPDATE',req.user.id);
      return res.json({success:true,message:'Corrección enviada correctamente'});
    }
    const idAprendiz = Number(task.id_asignado);
    if (req.user.rol !== 'Administrador' && Number(req.user.id) !== idAprendiz) { borrarArchivoSiExiste(req); return res.status(403).json({success:false,message:'Solo el aprendiz asignado puede entregar esta tarea'}); }
    const [r] = await db.query(`INSERT INTO entregas_tareas (id_tarea,id_aprendiz,comentario_aprendiz,url_entrega,ruta_archivo,estado,fecha_entrega) VALUES (?,?,?,?,?,'Entregada',NOW())`,[req.params.id,idAprendiz,comentario_aprendiz||null,url_entrega||null,ruta_archivo||null]);
    await registrarCambio('entregas_tareas',r.insertId,'INSERT',req.user.id);
    return res.status(201).json({success:true,message:'Entrega registrada correctamente',data:{id_entrega:r.insertId}});
  } catch(err){ borrarArchivoSiExiste(req); return res.status(500).json({success:false,message:'Error interno del servidor'}); }
};

const review = async (req,res) => {
  try {
    const { estado, observacion_instructor } = req.body;
    const permitidos = ['En revisión','Requiere corrección','Aprobada'];
    if (!permitidos.includes(estado)) return res.status(400).json({success:false,message:'Estado de revisión inválido'});
    const [rows] = await db.query('SELECT id_entrega FROM entregas_tareas WHERE id_tarea=?',[req.params.id]);
    if (!rows.length) return res.status(404).json({success:false,message:'No existe una entrega para esta tarea'});
    await db.query(`UPDATE entregas_tareas SET estado=?,observacion_instructor=?,fecha_revision=NOW() WHERE id_tarea=?`,[estado,observacion_instructor||null,req.params.id]);
    await registrarCambio('entregas_tareas',rows[0].id_entrega,'REVIEW',req.user.id);
    return res.json({success:true,message:'Revisión de entrega actualizada'});
  } catch(err){ return res.status(500).json({success:false,message:'Error interno del servidor'}); }
};
// GET /api/v1/entregas  (NUEVO — listado global de supervisión)
// Administrador ve todas las entregas; Instructor solo las de sus
// proyectos. Solo lectura — ni Admin ni este endpoint editan nada.
const getAllAdmin = async (req,res) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100);
    const offset = Math.max(Number(req.query.offset) || 0, 0);
    const { cc, estado, proyecto } = req.query;

    const condiciones = [];
    const params = [];
    if (req.user.rol === 'Instructor') {
      condiciones.push('p.id_instructor = ?');
      params.push(req.user.id);
    }
    if (cc) {
      condiciones.push('(ua.identificacion LIKE ? OR ui.identificacion LIKE ?)');
      params.push(`%${cc}%`, `%${cc}%`);
    }
    if (estado) { condiciones.push('e.estado = ?'); params.push(estado); }
    if (proyecto) { condiciones.push('p.nombre LIKE ?'); params.push(`%${proyecto}%`); }
    const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';

    const [rows] = await db.query(
      `SELECT e.*, t.titulo AS titulo_tarea, p.nombre AS nombre_proyecto,
              CONCAT(ua.nombres,' ',ua.apellidos) AS aprendiz_nombre, ua.identificacion AS cc_aprendiz,
              CONCAT(ui.nombres,' ',ui.apellidos) AS instructor_nombre, ui.identificacion AS cc_instructor
       FROM entregas_tareas e
       JOIN tareas t ON t.id_tarea = e.id_tarea
       JOIN proyectos p ON p.id_proyecto = t.id_proyecto
       JOIN usuarios ua ON ua.id_usuario = e.id_aprendiz
       JOIN usuarios ui ON ui.id_usuario = p.id_instructor
       ${where}
       ORDER BY e.fecha_entrega DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM entregas_tareas e JOIN tareas t ON t.id_tarea=e.id_tarea
       JOIN proyectos p ON p.id_proyecto=t.id_proyecto JOIN usuarios ua ON ua.id_usuario=e.id_aprendiz
       JOIN usuarios ui ON ui.id_usuario=p.id_instructor ${where}`,
      params
    );
    return res.json({success:true,data:rows,meta:{total,limit,offset}});
  } catch(err){ return res.status(500).json({success:false,message:err.message}); }
};

module.exports = { getByTarea, getAllAdmin, submit, review };
