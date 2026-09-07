const jwt = require('jsonwebtoken');
const db = require('../config/db');

const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ success:false, message:'Token de acceso requerido' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ success:false, message:'Token inválido o expirado' });
  }
};

const requireRole = (...roles) => (req,res,next) => {
  if (!req.user || !roles.includes(req.user.rol)) return res.status(403).json({success:false,message:'No tienes permisos para realizar esta acción'});
  next();
};

async function resolveProjectId(req, resource) {
  if (resource === 'project') return req.params.id || req.params.id_proyecto || req.body.id_proyecto;
  if (resource === 'project-direct') return req.params.id_proyecto || req.body.id_proyecto;
  const id = req.params.id;
  const bodyIds = { phase: req.body.id_fase, deliverable: req.body.id_entregable, comment: req.body.id_comentario, file: req.body.id_archivo, evaluation: req.body.id_evaluacion };
  const queries = {
    task: ['SELECT id_proyecto FROM tareas WHERE id_tarea = ?', id],
    phase: ['SELECT id_proyecto FROM fases_proyecto WHERE id_fase = ?', id || req.params.id_fase || bodyIds.phase],
    deliverable: ['SELECT f.id_proyecto FROM entregables e JOIN fases_proyecto f ON f.id_fase=e.id_fase WHERE e.id_entregable = ?', id || bodyIds.deliverable],
    repository: ['SELECT id_proyecto FROM repositorios WHERE id_repositorio = ?', id],
    meeting: ['SELECT id_proyecto FROM reuniones WHERE id_reunion = ?', id],
    message: ['SELECT id_proyecto FROM mensajes WHERE id_mensaje = ?', id],
    team: ['SELECT id_proyecto FROM equipos_proyecto WHERE id_equipo = ?', id],
    comment: ['SELECT f.id_proyecto FROM comentarios c JOIN entregables e ON e.id_entregable=c.id_entregable JOIN fases_proyecto f ON f.id_fase=e.id_fase WHERE c.id_comentario = ?', id],
    file: ['SELECT f.id_proyecto FROM archivos a JOIN entregables e ON e.id_entregable=a.id_entregable JOIN fases_proyecto f ON f.id_fase=e.id_fase WHERE a.id_archivo = ?', id],
    evaluation: ['SELECT f.id_proyecto FROM evaluaciones ev JOIN entregables e ON e.id_entregable=ev.id_entregable JOIN fases_proyecto f ON f.id_fase=e.id_fase WHERE ev.id_evaluacion = ?', id],
  };
  const q=queries[resource]; if(!q) return null;
  const [rows]=await db.query(q[0],[q[1]]); return rows[0]?.id_proyecto || null;
}

const requireProjectMember = (resource='project') => async (req,res,next) => {
  try {
    if (req.user?.rol === 'Administrador') return next();
    const projectId = await resolveProjectId(req, resource);
    if (!projectId) return res.status(404).json({success:false,message:'Proyecto o recurso no encontrado'});
    if (req.user?.rol === 'Instructor') {
      const [rows]=await db.query('SELECT id_proyecto FROM proyectos WHERE id_proyecto=? AND id_instructor=?',[projectId,req.user.id]);
      if (rows.length) return next();
    } else {
      const [rows]=await db.query('SELECT id_equipo FROM equipos_proyecto WHERE id_proyecto=? AND id_usuario=?',[projectId,req.user.id]);
      if (rows.length) return next();
    }
    return res.status(403).json({success:false,message:'No perteneces al proyecto solicitado'});
  } catch (err) { return next(err); }
};

// Solo Administrador o Instructor responsable pueden administrar la estructura del proyecto.
const requireProjectManager = (resource='project') => async (req,res,next) => {
  try {
    if (req.user?.rol === 'Administrador') return next();
    if (req.user?.rol !== 'Instructor') {
      return res.status(403).json({success:false,message:'Solo el instructor responsable puede administrar este recurso'});
    }

    const projectId = await resolveProjectId(req, resource);
    if (!projectId) return res.status(404).json({success:false,message:'Proyecto o recurso no encontrado'});

    const [rows] = await db.query(
      'SELECT id_proyecto FROM proyectos WHERE id_proyecto=? AND id_instructor=?',
      [projectId, req.user.id]
    );

    if (!rows.length) return res.status(403).json({success:false,message:'Solo el instructor responsable puede administrar este proyecto'});
    next();
  } catch (err) {
    next(err);
  }
};

// Administrador/instructor responsable: cualquier tarea del proyecto.
// Aprendiz: únicamente su propia tarea asignada.
const requireTaskEditor = async (req,res,next) => {
  try {
    if (req.user?.rol === 'Administrador') return next();

    const taskId = req.params.id;
    if (!taskId) return res.status(400).json({success:false,message:'Identificador de tarea requerido'});

    const [rows] = await db.query(
      'SELECT id_proyecto, id_asignado FROM tareas WHERE id_tarea=?',
      [taskId]
    );

    if (!rows.length) return res.status(404).json({success:false,message:'Tarea no encontrada'});

    const task = rows[0];

    if (req.user?.rol === 'Instructor') {
      const [projectRows] = await db.query(
        'SELECT id_proyecto FROM proyectos WHERE id_proyecto=? AND id_instructor=?',
        [task.id_proyecto, req.user.id]
      );
      if (projectRows.length) return next();
      return res.status(403).json({success:false,message:'Solo el instructor responsable puede modificar esta tarea'});
    }

    return res.status(403).json({success:false,message:'El aprendiz no puede modificar la tarea. Debe realizar o corregir su entrega.'});
  } catch (err) {
    next(err);
  }
};

const requireTaskOwnerOrAdmin = async (req,res,next) => {
  try {
    if (req.user?.rol === 'Administrador') return next();
    const [rows] = await db.query('SELECT id_asignado FROM tareas WHERE id_tarea=?', [req.params.id]);
    if (!rows.length) return res.status(404).json({success:false,message:'Tarea no encontrada'});
    if (req.user?.rol === 'Aprendiz' && Number(rows[0].id_asignado) === Number(req.user.id)) return next();
    return res.status(403).json({success:false,message:'Solo el aprendiz asignado puede realizar o corregir esta entrega'});
  } catch (err) { next(err); }
};

const requireTaskDeliveryReview = async (req,res,next) => {
  try {
    if (req.user?.rol === 'Administrador') return next();
    if (req.user?.rol !== 'Instructor') return res.status(403).json({success:false,message:'Solo el instructor responsable puede revisar entregas'});
    const [rows] = await db.query('SELECT p.id_proyecto FROM tareas t JOIN proyectos p ON p.id_proyecto=t.id_proyecto WHERE t.id_tarea=? AND p.id_instructor=?',[req.params.id,req.user.id]);
    if (!rows.length) return res.status(403).json({success:false,message:'Solo el instructor responsable puede revisar esta entrega'});
    next();
  } catch (err) { next(err); }
};

const requireNotificationOwner = async (req,res,next) => {
  try {
    if (req.user?.rol === 'Administrador') return next();
    const [rows] = await db.query(
      'SELECT id_usuario FROM notificaciones WHERE id_notificacion=?',
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({success:false,message:'Notificación no encontrada'});
    if (Number(rows[0].id_usuario) !== Number(req.user.id)) {
      return res.status(403).json({success:false,message:'Solo puedes gestionar tus propias notificaciones'});
    }
    next();
  } catch (err) {
    next(err);
  }
};

const requireSelfOrAdmin = (req,res,next) => {
  if (req.user?.rol === 'Administrador' || req.user?.id === Number(req.params.id)) return next();
  return res.status(403).json({success:false,message:'Solo puedes modificar tu propia cuenta'});
};

module.exports = {
  verifyToken,
  requireRole,
  requireProjectMember,
  requireProjectManager,
  requireTaskEditor,
  requireTaskOwnerOrAdmin,
  requireTaskDeliveryReview,
  requireNotificationOwner,
  requireSelfOrAdmin
};
