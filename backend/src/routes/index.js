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

module.exports = router;
