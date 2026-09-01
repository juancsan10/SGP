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

const requireSelfOrAdmin = (req,res,next) => {
  if (req.user?.rol === 'Administrador' || req.user?.id === Number(req.params.id)) return next();
  return res.status(403).json({success:false,message:'Solo puedes modificar tu propia cuenta'});
};

module.exports = { verifyToken, requireRole, requireProjectMember, requireSelfOrAdmin };
