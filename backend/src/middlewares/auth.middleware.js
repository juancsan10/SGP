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
  const targetId = {
    task: id || req.params.id_tarea || req.body.id_tarea,
    phase: id || req.params.id_fase || bodyIds.phase,
    deliverable: id || req.params.id_entregable || bodyIds.deliverable,
    repository: id || req.params.id_repositorio || req.body.id_repositorio,
    meeting: id || req.params.id_reunion || req.body.id_reunion,
    message: id || req.params.id_mensaje || req.body.id_mensaje,
    team: id || req.params.id_equipo || req.body.id_equipo,
    comment: id || req.params.id_comentario || bodyIds.comment,
    file: id || req.params.id_archivo || bodyIds.file,
    evaluation: id || req.params.id_evaluacion || bodyIds.evaluation,
  }[resource];

  if (!targetId) return null;

  const queries = {
    task: 'SELECT id_proyecto FROM tareas WHERE id_tarea = ?',
    phase: 'SELECT id_proyecto FROM fases_proyecto WHERE id_fase = ?',
    deliverable: 'SELECT f.id_proyecto FROM entregables e JOIN fases_proyecto f ON f.id_fase=e.id_fase WHERE e.id_entregable = ?',
    repository: 'SELECT id_proyecto FROM repositorios WHERE id_repositorio = ?',
    meeting: 'SELECT id_proyecto FROM reuniones WHERE id_reunion = ?',
    message: 'SELECT id_proyecto FROM mensajes WHERE id_mensaje = ?',
    team: 'SELECT id_proyecto FROM equipos_proyecto WHERE id_equipo = ?',
    comment: 'SELECT f.id_proyecto FROM comentarios c JOIN entregables e ON e.id_entregable=c.id_entregable JOIN fases_proyecto f ON f.id_fase=e.id_fase WHERE c.id_comentario = ?',
    file: 'SELECT f.id_proyecto FROM archivos a JOIN entregables e ON e.id_entregable=a.id_entregable JOIN fases_proyecto f ON f.id_fase=e.id_fase WHERE a.id_archivo = ?',
    evaluation: 'SELECT f.id_proyecto FROM evaluaciones ev JOIN entregables e ON e.id_entregable=ev.id_entregable JOIN fases_proyecto f ON f.id_fase=e.id_fase WHERE ev.id_evaluacion = ?',
  };
  const q = queries[resource];
  if (!q) return null;
  const [rows] = await db.query(q, [targetId]);
  return rows[0]?.id_proyecto || null;
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

const requireSelfOrAdmin = (req,res,next) => {
  if (req.user?.rol === 'Administrador' || req.user?.id === Number(req.params.id)) return next();
  return res.status(403).json({success:false,message:'Solo puedes modificar tu propia cuenta'});
};

module.exports = { verifyToken, requireRole, requireProjectMember, requireSelfOrAdmin };
