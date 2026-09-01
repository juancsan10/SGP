const express = require('express');
const router = express.Router();

const authRoutes         = require('./auth.routes');
const usuariosRoutes     = require('./usuarios.routes');
const proyectosRoutes    = require('./proyectos.routes');
const equiposRoutes      = require('./equipos.routes');
const fasesRoutes        = require('./fases.routes');
const entregablesRoutes  = require('./entregables.routes');
const tareasRoutes       = require('./tareas.routes');
const mensajesRoutes     = require('./mensajes.routes');
const notificacionesRoutes = require('./notificaciones.routes');
const repositoriosRoutes = require('./repositorios.routes');
const historialRoutes    = require('./historial.routes');

// NUEVOS — tablas que ya existían en el schema pero no tenían rutas/controladores
// (ver backend/README.md, sección "Cobertura actual de la API")
const comentariosRoutes       = require('./comentarios.routes');
const archivosRoutes          = require('./archivos.routes');
const evaluacionesRoutes      = require('./evaluaciones.routes');
const reunionesRoutes         = require('./reuniones.routes');
const githubIntegrationRoutes = require('./githubIntegration.routes');
const agendaRoutes = require('./agenda.routes');

router.use('/auth',           authRoutes);
router.use('/usuarios',       usuariosRoutes);
router.use('/proyectos',      proyectosRoutes);
router.use('/equipos',        equiposRoutes);
router.use('/fases',          fasesRoutes);
router.use('/entregables',    entregablesRoutes);
router.use('/tareas',         tareasRoutes);
router.use('/mensajes',       mensajesRoutes);
router.use('/notificaciones', notificacionesRoutes);
router.use('/repositorios',   repositoriosRoutes);
router.use('/historial',      historialRoutes);

// NUEVOS
router.use('/comentarios',        comentariosRoutes);
router.use('/archivos',           archivosRoutes);
router.use('/evaluaciones',       evaluacionesRoutes);
router.use('/reuniones',          reunionesRoutes);
router.use('/github-integration', githubIntegrationRoutes);
router.use('/agenda', agendaRoutes);

module.exports = router;
